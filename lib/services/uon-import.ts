import { db } from '@/lib/db/drizzle';
import { 
  uonTourists, 
  uonRequests, 
  uonBills, 
  uonClients, 
  uonLeads, 
  uonManagers, 
  uonCallHistory,
  uonSyncLog,
  type UonTourist,
  type UonRequest,
  type UonBill,
  type UonClient,
  type UonLead,
  type UonManager,
  type UonCallHistory,
  type UonSyncLog
} from '@/lib/db/schema';
import { initUonClient } from '@/lib/api/uon-client';
import { eq } from 'drizzle-orm';
import { ErrorLogger } from './error-logger';

export interface ImportResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  error?: string;
}

export class UonImportService {
  private apiKey: string;
  private client: any;
  private teamId: number;

  constructor(apiKey: string, teamId: number) {
    this.apiKey = apiKey;
    this.teamId = teamId;
    this.client = initUonClient({ apiKey });
  }

  /**
   * Импорт истории звонков
   */
  async importCallHistory(): Promise<ImportResult> {
    const startTime = new Date();
    const logId = await this.logSyncStart('call_history');
    
    try {
      console.log('Начинаем импорт истории звонков...');
      
      let allCalls: any[] = [];
      let page = 1;
      let hasMoreData = true;
      
      // Получаем все страницы данных
      while (hasMoreData) {
        const response = await this.client.getCallHistory(page);
        console.log(`getCallHistory page ${page} response:`, JSON.stringify(response, null, 2));
        
        if (!response.success) {
          // Если это 404 ошибка, значит больше страниц нет
          if (response.error && response.error.includes('404')) {
            console.log(`Достигнут конец данных на странице ${page}, завершаем загрузку`);
            hasMoreData = false;
            break;
          }
          throw new Error(`Ошибка API на странице ${page}: ${response.error || 'Неизвестная ошибка'}`);
        }
        
        const calls = response.data;
        console.log(`Получены данные звонков на странице ${page}:`, calls);
        
        if (!calls || !Array.isArray(calls) || calls.length === 0) {
          console.log(`Нет данных на странице ${page}, завершаем загрузку`);
          hasMoreData = false;
          break;
        }
        
        console.log(`Добавляем ${calls.length} звонков со страницы ${page}`);
        allCalls = allCalls.concat(calls);
        page++;
        
        // Защита от бесконечного цикла
        if (page > 1000) {
          console.warn('Достигнут лимит страниц (1000), прерываем загрузку');
          break;
        }
      }

      let recordsCreated = 0;
      let recordsUpdated = 0;

      for (const call of allCalls) {
        try {
          // Проверяем, существует ли звонок
          const existing = await db.select()
            .from(uonCallHistory)
            .where(eq(uonCallHistory.uonId, call.id))
            .limit(1);

          const callData = {
            uonId: call.id,
            clientId: call.client_id || null,
            managerId: call.manager_id || null,
            direction: call.direction || null,
            phone: call.phone || null,
            start: call.start || null,
            duration: call.duration || 0,
            recordLink: call.record_link || null,
            note: call.note || null,
            updatedAt: new Date(),
            syncedAt: new Date(),
          };

          if (existing.length > 0) {
            // Обновляем существующий
            await db.update(uonCallHistory)
              .set(callData)
              .where(eq(uonCallHistory.uonId, call.id));
            recordsUpdated++;
          } else {
            // Создаем новый
            await db.insert(uonCallHistory).values({
              ...callData,
              teamId: this.teamId,
              createdAt: new Date(),
            });
            recordsCreated++;
          }
        } catch (error) {
          console.error(`Ошибка при обработке звонка ${call.id}:`, error);
          await ErrorLogger.logSyncError('call_history', error instanceof Error ? error : new Error(String(error)));
        }
      }

      const result: ImportResult = {
        success: true,
        recordsProcessed: allCalls.length,
        recordsCreated,
        recordsUpdated,
      };

      await this.logSyncComplete(logId, result, startTime);
      console.log(`Импорт истории звонков завершен: ${recordsCreated} создано, ${recordsUpdated} обновлено`);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('Ошибка при импорте истории звонков:', errorMessage);
      
      const result: ImportResult = {
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        error: errorMessage,
      };

      await this.logSyncComplete(logId, result, startTime);
      await ErrorLogger.logSyncError('call_history', error instanceof Error ? error : new Error(errorMessage));
      return result;
    }
  }

  /**
   * Логирует начало синхронизации
   */
  private async logSyncStart(entityType: string): Promise<number> {
    const [result] = await db.insert(uonSyncLog).values({
      teamId: this.teamId,
      entityType,
      status: 'running',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      startedAt: new Date(),
    }).returning({ id: uonSyncLog.id });
    
    return result.id;
  }

  /**
   * Логирует завершение синхронизации
   */
  private async logSyncComplete(
    logId: number, 
    result: ImportResult, 
    startTime: Date
  ): Promise<void> {
    const duration = Date.now() - startTime.getTime();
    
    await db.update(uonSyncLog)
      .set({
        status: result.success ? 'completed' : 'failed',
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        errorMessage: result.error,
        completedAt: new Date(),
        duration: Math.round(duration / 1000), // в секундах
      })
      .where(eq(uonSyncLog.id, logId));
  }

  /**
   * Импорт туристов
   */
  async importTourists(): Promise<ImportResult> {
    const startTime = new Date();
    const logId = await this.logSyncStart('tourists');
    
    try {
      console.log('Начинаем импорт туристов...');
      
      // Получаем данные из API
      const response = await this.client.getAllTourists();
      console.log('getAllTourists response:', response);
      
      if (!response.success) {
        throw new Error(`Ошибка API: ${response.error || 'Неизвестная ошибка'}`);
      }
      
      const tourists = response.data;
      
      if (!tourists || !Array.isArray(tourists)) {
        throw new Error('Не удалось получить данные туристов из API');
      }

      let recordsCreated = 0;
      let recordsUpdated = 0;

      for (const tourist of tourists) {
        try {
          // Проверяем, существует ли турист
          const existing = await db.select()
            .from(uonTourists)
            .where(eq(uonTourists.uonId, tourist.id))
            .limit(1);

          const touristData = {
            uonId: tourist.id,
            name: tourist.name || '',
            email: tourist.email || null,
            phone: tourist.phone || null,
            country: tourist.country || null,
            city: tourist.city || null,
            birthDate: tourist.birth_date || null,
            passportNumber: tourist.passport_number || null,
            lastTripDate: tourist.last_trip_date || null,
            totalTrips: tourist.total_trips || 0,
            totalSpent: tourist.total_spent ? tourist.total_spent.toString() : '0',
            status: tourist.status || 'active',
            updatedAt: new Date(),
            syncedAt: new Date(),
          };

          if (existing.length > 0) {
            // Обновляем существующего
            await db.update(uonTourists)
              .set(touristData)
              .where(eq(uonTourists.uonId, tourist.id));
            recordsUpdated++;
          } else {
            // Создаем нового
            await db.insert(uonTourists).values({
              ...touristData,
              teamId: this.teamId,
              createdAt: new Date(),
            });
            recordsCreated++;
          }
        } catch (error) {
          console.error(`Ошибка при обработке туриста ${tourist.id}:`, error);
          await ErrorLogger.logSyncError('tourists', error instanceof Error ? error : new Error(String(error)));
        }
      }

      const result: ImportResult = {
        success: true,
        recordsProcessed: tourists.length,
        recordsCreated,
        recordsUpdated,
      };

      await this.logSyncComplete(logId, result, startTime);
      console.log(`Импорт туристов завершен: ${recordsCreated} создано, ${recordsUpdated} обновлено`);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('Ошибка при импорте туристов:', errorMessage);
      
      const result: ImportResult = {
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        error: errorMessage,
      };

      await this.logSyncComplete(logId, result, startTime);
      await ErrorLogger.logSyncError('tourists', error instanceof Error ? error : new Error(errorMessage));
      return result;
    }
  }

  /**
   * Импорт заявок
   */
  async importRequests(): Promise<ImportResult> {
    const startTime = new Date();
    const logId = await this.logSyncStart('requests');
    
    try {
      console.log('Начинаем импорт заявок...');
      
      // Получаем данные из API
      const response = await this.client.getRequests();
      console.log('getRequests response:', response);
      
      if (!response.success) {
        throw new Error(`Ошибка API: ${response.error || 'Неизвестная ошибка'}`);
      }
      
      const requests = response.data;
      
      if (!requests || !Array.isArray(requests)) {
        throw new Error('Не удалось получить данные заявок из API');
      }

      let recordsCreated = 0;
      let recordsUpdated = 0;

      for (const request of requests) {
        try {
          // Проверяем, существует ли заявка
          const existing = await db.select()
            .from(uonRequests)
            .where(eq(uonRequests.uonId, request.id))
            .limit(1);

          const requestData = {
            uonId: request.id,
            name: request.name || '',
            country: request.country || null,
            city: request.city || null,
            departureDate: request.departure_date || null,
            returnDate: request.return_date || null,
            adults: request.adults || 0,
            children: request.children || 0,
            totalAmount: request.total_amount ? request.total_amount.toString() : '0',
            status: request.status || 'new',
            managerId: request.manager_id || null,
            updatedAt: new Date(),
            syncedAt: new Date(),
          };

          if (existing.length > 0) {
            // Обновляем существующую
            await db.update(uonRequests)
              .set(requestData)
              .where(eq(uonRequests.uonId, request.id));
            recordsUpdated++;
          } else {
            // Создаем новую
            await db.insert(uonRequests).values({
              ...requestData,
              teamId: this.teamId,
              createdAt: new Date(),
            });
            recordsCreated++;
          }
        } catch (error) {
          console.error(`Ошибка при обработке заявки ${request.id}:`, error);
          await ErrorLogger.logSyncError('requests', error instanceof Error ? error : new Error(String(error)));
        }
      }

      const result: ImportResult = {
        success: true,
        recordsProcessed: requests.length,
        recordsCreated,
        recordsUpdated,
      };

      await this.logSyncComplete(logId, result, startTime);
      console.log(`Импорт заявок завершен: ${recordsCreated} создано, ${recordsUpdated} обновлено`);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('Ошибка при импорте заявок:', errorMessage);
      
      const result: ImportResult = {
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        error: errorMessage,
      };

      await this.logSyncComplete(logId, result, startTime);
      await ErrorLogger.logSyncError('requests', error instanceof Error ? error : new Error(errorMessage));
      return result;
    }
  }

  /**
   * Импорт всех данных
   */
  async importAll(): Promise<{
    tourists: ImportResult;
    requests: ImportResult;
    callHistory: ImportResult;
  }> {
    console.log('Начинаем полный импорт данных U-ON...');
    
    const results = {
      tourists: await this.importTourists(),
      requests: await this.importRequests(),
      callHistory: await this.importCallHistory(),
    };

    console.log('Полный импорт завершен:', results);
    return results;
  }

  /**
   * Получение статистики последней синхронизации
   */
  async getLastSyncStats(): Promise<UonSyncLog[]> {
    return await db.select()
      .from(uonSyncLog)
      .orderBy(uonSyncLog.startedAt)
      .limit(10);
  }
}

/**
 * Создает экземпляр сервиса импорта с API ключом из localStorage
 */
export function createImportService(apiKey: string, teamId: number): UonImportService {
  return new UonImportService(apiKey, teamId);
}