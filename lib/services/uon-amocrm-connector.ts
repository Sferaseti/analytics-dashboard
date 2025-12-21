/**
 * U-ON to amoCRM Connector Service
 * Сервис для синхронизации данных между U-ON.RU и amoCRM
 */

import { db } from '@/lib/db/drizzle';
import {
  amoCrmSettings,
  amoCrmSyncConfig,
  amoCrmEntityMapping,
  amoCrmSyncLog,
  amoCrmSyncQueue,
  uonTourists,
  uonRequests,
  uonLeads,
  uonCallHistory,
  type AmoCrmSettings,
  type AmoCrmSyncConfig,
  type AmoCrmEntityMapping,
} from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import {
  AmoCrmApiClient,
  type AmoCrmContact,
  type AmoCrmLead,
  type AmoCrmNote,
  type AmoCrmCustomField,
} from '@/lib/api/amocrm-client';
import { UonApiClient, initUonClient } from '@/lib/api/uon-client';

// Типы для маппинга полей
interface FieldMapping {
  uonField: string;
  amoField: string;
  amoFieldId?: number;
  transform?: 'none' | 'phone' | 'email' | 'date' | 'currency';
}

interface StatusMapping {
  uonStatus: string;
  amoStatusId: number;
  amoPipelineId: number;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: string[];
}

export class UonAmoCrmConnector {
  private teamId: number;
  private uonClient: UonApiClient | null = null;
  private amoClient: AmoCrmApiClient | null = null;
  private settings: AmoCrmSettings | null = null;
  private syncConfigs: AmoCrmSyncConfig[] = [];

  constructor(teamId: number) {
    this.teamId = teamId;
  }

  /**
   * Инициализация коннектора
   */
  async initialize(): Promise<boolean> {
    try {
      // Загружаем настройки amoCRM
      const [settings] = await db
        .select()
        .from(amoCrmSettings)
        .where(eq(amoCrmSettings.teamId, this.teamId))
        .limit(1);

      if (!settings) {
        console.log('❌ [Connector] Настройки amoCRM не найдены');
        return false;
      }

      this.settings = settings;

      if (!settings.accessToken || !settings.isActive) {
        console.log('❌ [Connector] amoCRM не активирован или отсутствует токен');
        return false;
      }

      // Инициализируем amoCRM клиент
      this.amoClient = new AmoCrmApiClient({
        subdomain: settings.subdomain,
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        redirectUri: settings.redirectUri,
        accessToken: settings.accessToken,
        refreshToken: settings.refreshToken || undefined,
        expiresAt: settings.expiresAt ? settings.expiresAt.getTime() : undefined,
      });

      // Устанавливаем callback для обновления токенов
      this.amoClient.onTokenRefresh = async (tokens) => {
        await db
          .update(amoCrmSettings)
          .set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: new Date(tokens.expiresAt),
            updatedAt: new Date(),
          })
          .where(eq(amoCrmSettings.teamId, this.teamId));
      };

      // Загружаем конфигурации синхронизации
      this.syncConfigs = await db
        .select()
        .from(amoCrmSyncConfig)
        .where(eq(amoCrmSyncConfig.teamId, this.teamId));

      console.log('✅ [Connector] Инициализация успешна');
      return true;
    } catch (error) {
      console.error('❌ [Connector] Ошибка инициализации:', error);
      return false;
    }
  }

  /**
   * Инициализация U-ON клиента
   */
  async initUonClient(apiKey: string): Promise<void> {
    this.uonClient = initUonClient({ apiKey });
  }

  /**
   * Получить конфигурацию синхронизации для типа сущности
   */
  private getSyncConfig(entityType: string): AmoCrmSyncConfig | undefined {
    return this.syncConfigs.find((c) => c.entityType === entityType && c.isEnabled);
  }

  /**
   * Парсинг маппинга полей
   */
  private parseFieldMapping(config: AmoCrmSyncConfig): FieldMapping[] {
    if (!config.fieldMapping) return this.getDefaultFieldMapping(config.entityType);
    try {
      return JSON.parse(config.fieldMapping);
    } catch {
      return this.getDefaultFieldMapping(config.entityType);
    }
  }

  /**
   * Парсинг маппинга статусов
   */
  private parseStatusMapping(config: AmoCrmSyncConfig): StatusMapping[] {
    if (!config.statusMapping) return [];
    try {
      return JSON.parse(config.statusMapping);
    } catch {
      return [];
    }
  }

  /**
   * Дефолтный маппинг полей
   */
  private getDefaultFieldMapping(entityType: string): FieldMapping[] {
    switch (entityType) {
      case 'tourists':
        return [
          { uonField: 'name', amoField: 'name', transform: 'none' },
          { uonField: 'email', amoField: 'email', transform: 'email' },
          { uonField: 'phone', amoField: 'phone', transform: 'phone' },
        ];
      case 'requests':
        return [
          { uonField: 'name', amoField: 'name', transform: 'none' },
          { uonField: 'totalAmount', amoField: 'price', transform: 'currency' },
        ];
      case 'leads':
        return [
          { uonField: 'name', amoField: 'name', transform: 'none' },
          { uonField: 'email', amoField: 'email', transform: 'email' },
          { uonField: 'phone', amoField: 'phone', transform: 'phone' },
          { uonField: 'budget', amoField: 'price', transform: 'currency' },
        ];
      default:
        return [];
    }
  }

  /**
   * Логирование начала синхронизации
   */
  private async logSyncStart(entityType: string, direction: string): Promise<number> {
    const [result] = await db
      .insert(amoCrmSyncLog)
      .values({
        teamId: this.teamId,
        entityType,
        direction,
        status: 'running',
        startedAt: new Date(),
      })
      .returning({ id: amoCrmSyncLog.id });
    return result.id;
  }

  /**
   * Логирование завершения синхронизации
   */
  private async logSyncComplete(logId: number, result: SyncResult, startTime: Date): Promise<void> {
    const duration = Math.round((Date.now() - startTime.getTime()) / 1000);
    await db
      .update(amoCrmSyncLog)
      .set({
        status: result.success ? 'completed' : 'failed',
        recordsProcessed: result.recordsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        recordsFailed: result.recordsFailed,
        errorMessage: result.errors.length > 0 ? result.errors.join('\n') : null,
        completedAt: new Date(),
        duration,
      })
      .where(eq(amoCrmSyncLog.id, logId));
  }

  /**
   * Получить или создать маппинг сущности
   */
  private async getEntityMapping(
    uonEntityType: string,
    uonEntityId: number,
    amoEntityType: string
  ): Promise<AmoCrmEntityMapping | null> {
    const [mapping] = await db
      .select()
      .from(amoCrmEntityMapping)
      .where(
        and(
          eq(amoCrmEntityMapping.teamId, this.teamId),
          eq(amoCrmEntityMapping.uonEntityType, uonEntityType),
          eq(amoCrmEntityMapping.uonEntityId, uonEntityId),
          eq(amoCrmEntityMapping.amoEntityType, amoEntityType)
        )
      )
      .limit(1);
    return mapping || null;
  }

  /**
   * Сохранить маппинг сущности
   */
  private async saveEntityMapping(
    uonEntityType: string,
    uonEntityId: number,
    amoEntityType: string,
    amoEntityId: number,
    status: string = 'synced',
    error?: string
  ): Promise<void> {
    const existing = await this.getEntityMapping(uonEntityType, uonEntityId, amoEntityType);

    if (existing) {
      await db
        .update(amoCrmEntityMapping)
        .set({
          amoEntityId,
          syncStatus: status,
          lastSyncAt: new Date(),
          lastError: error || null,
          updatedAt: new Date(),
        })
        .where(eq(amoCrmEntityMapping.id, existing.id));
    } else {
      await db.insert(amoCrmEntityMapping).values({
        teamId: this.teamId,
        uonEntityType,
        uonEntityId,
        amoEntityType,
        amoEntityId,
        syncStatus: status,
        lastSyncAt: new Date(),
        lastError: error || null,
      });
    }
  }

  /**
   * Форматирование телефона для amoCRM
   */
  private formatPhone(phone: string | null): string | null {
    if (!phone) return null;
    // Удаляем все кроме цифр и +
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * Создание кастомных полей для контакта
   */
  private createContactCustomFields(data: any, fieldMapping: FieldMapping[]): AmoCrmCustomField[] {
    const customFields: AmoCrmCustomField[] = [];

    // Стандартные поля amoCRM для контактов
    // Email - field_id обычно для email
    if (data.email) {
      customFields.push({
        field_id: 0, // Будет заменен на реальный ID
        field_code: 'EMAIL',
        values: [{ value: data.email, enum_code: 'WORK' }],
      });
    }

    // Телефон
    if (data.phone) {
      customFields.push({
        field_id: 0,
        field_code: 'PHONE',
        values: [{ value: this.formatPhone(data.phone) || data.phone, enum_code: 'WORK' }],
      });
    }

    return customFields;
  }

  // ==================== СИНХРОНИЗАЦИЯ ТУРИСТОВ -> КОНТАКТЫ ====================

  /**
   * Синхронизация туристов из U-ON в контакты amoCRM
   */
  async syncTouristsToContacts(): Promise<SyncResult> {
    const startTime = new Date();
    const logId = await this.logSyncStart('tourists', 'uon_to_amo');

    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      if (!this.amoClient) {
        throw new Error('amoCRM клиент не инициализирован');
      }

      const config = this.getSyncConfig('tourists');
      if (!config) {
        console.log('⚠️ [Connector] Синхронизация туристов отключена');
        result.success = true;
        await this.logSyncComplete(logId, result, startTime);
        return result;
      }

      const fieldMapping = this.parseFieldMapping(config);

      // Получаем туристов из БД
      const tourists = await db
        .select()
        .from(uonTourists)
        .where(eq(uonTourists.teamId, this.teamId));

      console.log(`📊 [Connector] Найдено ${tourists.length} туристов для синхронизации`);

      for (const tourist of tourists) {
        result.recordsProcessed++;

        try {
          // Проверяем существующий маппинг
          const existingMapping = await this.getEntityMapping('tourist', tourist.uonId, 'contact');

          // Подготавливаем данные контакта
          const contactData: Omit<AmoCrmContact, 'id'> = {
            name: tourist.name,
            custom_fields_values: this.createContactCustomFields(tourist, fieldMapping),
          };

          if (existingMapping && config.updateExisting) {
            // Обновляем существующий контакт
            const updateResult = await this.amoClient.updateContacts([
              { id: existingMapping.amoEntityId, ...contactData },
            ]);

            if (updateResult.success) {
              result.recordsUpdated++;
              await this.saveEntityMapping('tourist', tourist.uonId, 'contact', existingMapping.amoEntityId);
            } else {
              result.recordsFailed++;
              result.errors.push(`Ошибка обновления контакта для туриста ${tourist.uonId}: ${updateResult.error}`);
              await this.saveEntityMapping(
                'tourist',
                tourist.uonId,
                'contact',
                existingMapping.amoEntityId,
                'error',
                updateResult.error
              );
            }
          } else if (!existingMapping && config.createIfNotExists) {
            // Пробуем найти контакт по email или телефону
            let foundContact: AmoCrmContact | null = null;

            if (tourist.email || tourist.phone) {
              const searchResult = await this.amoClient.findContactByEmailOrPhone(
                tourist.email || undefined,
                tourist.phone || undefined
              );

              if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
                foundContact = searchResult.data[0];
              }
            }

            if (foundContact && foundContact.id) {
              // Связываем с найденным контактом
              await this.saveEntityMapping('tourist', tourist.uonId, 'contact', foundContact.id);
              result.recordsSkipped++;
            } else {
              // Создаем новый контакт
              const createResult = await this.amoClient.createContacts([contactData]);

              if (createResult.success && createResult.data && createResult.data.length > 0) {
                const newContact = createResult.data[0];
                if (newContact.id) {
                  await this.saveEntityMapping('tourist', tourist.uonId, 'contact', newContact.id);
                  result.recordsCreated++;
                }
              } else {
                result.recordsFailed++;
                result.errors.push(
                  `Ошибка создания контакта для туриста ${tourist.uonId}: ${createResult.error}`
                );
              }
            }
          } else {
            result.recordsSkipped++;
          }
        } catch (error) {
          result.recordsFailed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Ошибка обработки туриста ${tourist.uonId}: ${errorMsg}`);
        }
      }

      result.success = result.recordsFailed === 0;
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Критическая ошибка синхронизации: ${errorMsg}`);
    }

    await this.logSyncComplete(logId, result, startTime);
    console.log(`✅ [Connector] Синхронизация туристов завершена:`, result);
    return result;
  }

  // ==================== СИНХРОНИЗАЦИЯ ЗАЯВОК -> СДЕЛКИ ====================

  /**
   * Синхронизация заявок из U-ON в сделки amoCRM
   */
  async syncRequestsToLeads(): Promise<SyncResult> {
    const startTime = new Date();
    const logId = await this.logSyncStart('requests', 'uon_to_amo');

    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      if (!this.amoClient) {
        throw new Error('amoCRM клиент не инициализирован');
      }

      const config = this.getSyncConfig('requests');
      if (!config) {
        console.log('⚠️ [Connector] Синхронизация заявок отключена');
        result.success = true;
        await this.logSyncComplete(logId, result, startTime);
        return result;
      }

      const statusMapping = this.parseStatusMapping(config);

      // Получаем заявки из БД
      const requests = await db
        .select()
        .from(uonRequests)
        .where(eq(uonRequests.teamId, this.teamId));

      console.log(`📊 [Connector] Найдено ${requests.length} заявок для синхронизации`);

      for (const request of requests) {
        result.recordsProcessed++;

        try {
          // Проверяем существующий маппинг
          const existingMapping = await this.getEntityMapping('request', request.uonId, 'lead');

          // Определяем статус и воронку
          let statusId: number | undefined;
          let pipelineId = config.pipelineId || undefined;

          const statusMap = statusMapping.find((s) => s.uonStatus === request.status);
          if (statusMap) {
            statusId = statusMap.amoStatusId;
            pipelineId = statusMap.amoPipelineId;
          }

          // Подготавливаем данные сделки
          const leadData: Omit<AmoCrmLead, 'id'> = {
            name: request.name || `Заявка #${request.uonId}`,
            price: request.totalAmount ? parseFloat(request.totalAmount) : undefined,
            status_id: statusId,
            pipeline_id: pipelineId,
            custom_fields_values: [
              {
                field_id: 0,
                field_code: 'UON_REQUEST_ID',
                values: [{ value: request.uonId }],
              },
            ],
          };

          if (existingMapping && config.updateExisting) {
            // Обновляем существующую сделку
            const updateResult = await this.amoClient.updateLeads([
              { id: existingMapping.amoEntityId, ...leadData },
            ]);

            if (updateResult.success) {
              result.recordsUpdated++;
              await this.saveEntityMapping('request', request.uonId, 'lead', existingMapping.amoEntityId);
            } else {
              result.recordsFailed++;
              result.errors.push(`Ошибка обновления сделки для заявки ${request.uonId}: ${updateResult.error}`);
            }
          } else if (!existingMapping && config.createIfNotExists) {
            // Создаем новую сделку
            const createResult = await this.amoClient.createLeads([leadData]);

            if (createResult.success && createResult.data && createResult.data.length > 0) {
              const newLead = createResult.data[0];
              if (newLead.id) {
                await this.saveEntityMapping('request', request.uonId, 'lead', newLead.id);
                result.recordsCreated++;
              }
            } else {
              result.recordsFailed++;
              result.errors.push(`Ошибка создания сделки для заявки ${request.uonId}: ${createResult.error}`);
            }
          } else {
            result.recordsSkipped++;
          }
        } catch (error) {
          result.recordsFailed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Ошибка обработки заявки ${request.uonId}: ${errorMsg}`);
        }
      }

      result.success = result.recordsFailed === 0;
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Критическая ошибка синхронизации: ${errorMsg}`);
    }

    await this.logSyncComplete(logId, result, startTime);
    console.log(`✅ [Connector] Синхронизация заявок завершена:`, result);
    return result;
  }

  // ==================== СИНХРОНИЗАЦИЯ ЛИДОВ U-ON -> СДЕЛКИ ====================

  /**
   * Синхронизация лидов из U-ON в сделки amoCRM
   */
  async syncLeadsToAmoLeads(): Promise<SyncResult> {
    const startTime = new Date();
    const logId = await this.logSyncStart('leads', 'uon_to_amo');

    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      if (!this.amoClient) {
        throw new Error('amoCRM клиент не инициализирован');
      }

      const config = this.getSyncConfig('leads');
      if (!config) {
        console.log('⚠️ [Connector] Синхронизация лидов отключена');
        result.success = true;
        await this.logSyncComplete(logId, result, startTime);
        return result;
      }

      // Получаем лиды из БД
      const leads = await db
        .select()
        .from(uonLeads)
        .where(eq(uonLeads.teamId, this.teamId));

      console.log(`📊 [Connector] Найдено ${leads.length} лидов для синхронизации`);

      for (const lead of leads) {
        result.recordsProcessed++;

        try {
          // Проверяем существующий маппинг
          const existingMapping = await this.getEntityMapping('lead', lead.uonId, 'lead');

          // Подготавливаем данные сделки
          const leadData: Omit<AmoCrmLead, 'id'> = {
            name: lead.name || `Лид #${lead.uonId}`,
            price: lead.budget ? parseFloat(lead.budget) : undefined,
            pipeline_id: config.pipelineId || undefined,
          };

          // Сначала создаем/находим контакт
          let contactId: number | undefined;

          if (lead.email || lead.phone) {
            // Пробуем найти контакт
            const searchResult = await this.amoClient.findContactByEmailOrPhone(
              lead.email || undefined,
              lead.phone || undefined
            );

            if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
              contactId = searchResult.data[0].id;
            } else {
              // Создаем новый контакт
              const contactData: Omit<AmoCrmContact, 'id'> = {
                name: lead.name,
                custom_fields_values: this.createContactCustomFields(lead, []),
              };

              const createContactResult = await this.amoClient.createContacts([contactData]);
              if (createContactResult.success && createContactResult.data?.[0]?.id) {
                contactId = createContactResult.data[0].id;
              }
            }
          }

          if (existingMapping && config.updateExisting) {
            // Обновляем существующую сделку
            const updateResult = await this.amoClient.updateLeads([
              { id: existingMapping.amoEntityId, ...leadData },
            ]);

            if (updateResult.success) {
              result.recordsUpdated++;
              await this.saveEntityMapping('lead', lead.uonId, 'lead', existingMapping.amoEntityId);
            } else {
              result.recordsFailed++;
              result.errors.push(`Ошибка обновления сделки для лида ${lead.uonId}: ${updateResult.error}`);
            }
          } else if (!existingMapping && config.createIfNotExists) {
            // Создаем новую сделку
            let createResult;

            if (contactId) {
              createResult = await this.amoClient.createLeadWithContact(leadData, contactId);
            } else {
              createResult = await this.amoClient.createLeads([leadData]);
            }

            if (createResult.success && createResult.data && createResult.data.length > 0) {
              const newLead = createResult.data[0];
              if (newLead.id) {
                await this.saveEntityMapping('lead', lead.uonId, 'lead', newLead.id);
                result.recordsCreated++;
              }
            } else {
              result.recordsFailed++;
              result.errors.push(`Ошибка создания сделки для лида ${lead.uonId}: ${createResult.error}`);
            }
          } else {
            result.recordsSkipped++;
          }
        } catch (error) {
          result.recordsFailed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Ошибка обработки лида ${lead.uonId}: ${errorMsg}`);
        }
      }

      result.success = result.recordsFailed === 0;
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Критическая ошибка синхронизации: ${errorMsg}`);
    }

    await this.logSyncComplete(logId, result, startTime);
    console.log(`✅ [Connector] Синхронизация лидов завершена:`, result);
    return result;
  }

  // ==================== СИНХРОНИЗАЦИЯ ЗВОНКОВ -> ПРИМЕЧАНИЯ ====================

  /**
   * Синхронизация истории звонков в примечания к контактам
   */
  async syncCallsToNotes(): Promise<SyncResult> {
    const startTime = new Date();
    const logId = await this.logSyncStart('calls', 'uon_to_amo');

    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      if (!this.amoClient) {
        throw new Error('amoCRM клиент не инициализирован');
      }

      const config = this.getSyncConfig('calls');
      if (!config) {
        console.log('⚠️ [Connector] Синхронизация звонков отключена');
        result.success = true;
        await this.logSyncComplete(logId, result, startTime);
        return result;
      }

      // Получаем звонки из БД
      const calls = await db
        .select()
        .from(uonCallHistory)
        .where(eq(uonCallHistory.teamId, this.teamId));

      console.log(`📊 [Connector] Найдено ${calls.length} звонков для синхронизации`);

      for (const call of calls) {
        result.recordsProcessed++;

        try {
          // Проверяем существующий маппинг
          const existingMapping = await this.getEntityMapping('call', call.uonId, 'note');

          if (existingMapping) {
            // Примечания в amoCRM нельзя обновлять, пропускаем
            result.recordsSkipped++;
            continue;
          }

          // Ищем контакт по телефону
          if (!call.phone) {
            result.recordsSkipped++;
            continue;
          }

          const searchResult = await this.amoClient.findContactByEmailOrPhone(undefined, call.phone);

          if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
            result.recordsSkipped++;
            continue;
          }

          const contact = searchResult.data[0];
          if (!contact.id) {
            result.recordsSkipped++;
            continue;
          }

          // Создаем примечание о звонке
          const noteData: Omit<AmoCrmNote, 'id' | 'entity_id'> = {
            note_type: call.direction === 'incoming' ? 'call_in' : 'call_out',
            params: {
              phone: call.phone,
              duration: call.duration || 0,
              source: 'U-ON',
              link: call.recordLink || undefined,
            },
          };

          const createResult = await this.amoClient.addNote('contacts', contact.id, noteData);

          if (createResult.success && createResult.data && createResult.data.length > 0) {
            const newNote = createResult.data[0];
            if (newNote.id) {
              await this.saveEntityMapping('call', call.uonId, 'note', newNote.id);
              result.recordsCreated++;
            }
          } else {
            result.recordsFailed++;
            result.errors.push(`Ошибка создания примечания для звонка ${call.uonId}: ${createResult.error}`);
          }
        } catch (error) {
          result.recordsFailed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Ошибка обработки звонка ${call.uonId}: ${errorMsg}`);
        }
      }

      result.success = result.recordsFailed === 0;
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Критическая ошибка синхронизации: ${errorMsg}`);
    }

    await this.logSyncComplete(logId, result, startTime);
    console.log(`✅ [Connector] Синхронизация звонков завершена:`, result);
    return result;
  }

  // ==================== ПОЛНАЯ СИНХРОНИЗАЦИЯ ====================

  /**
   * Запуск полной синхронизации всех сущностей
   */
  async syncAll(): Promise<{
    tourists: SyncResult;
    requests: SyncResult;
    leads: SyncResult;
    calls: SyncResult;
  }> {
    console.log('🚀 [Connector] Запуск полной синхронизации U-ON -> amoCRM');

    const results = {
      tourists: await this.syncTouristsToContacts(),
      requests: await this.syncRequestsToLeads(),
      leads: await this.syncLeadsToAmoLeads(),
      calls: await this.syncCallsToNotes(),
    };

    // Обновляем время последней синхронизации
    await db
      .update(amoCrmSettings)
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(amoCrmSettings.teamId, this.teamId));

    console.log('✅ [Connector] Полная синхронизация завершена');
    return results;
  }

  // ==================== СТАТИСТИКА ====================

  /**
   * Получение статистики синхронизации
   */
  async getSyncStats(): Promise<{
    lastSync: Date | null;
    totalMappings: number;
    mappingsByType: Record<string, number>;
    recentLogs: any[];
  }> {
    const [mappings, logs] = await Promise.all([
      db.select().from(amoCrmEntityMapping).where(eq(amoCrmEntityMapping.teamId, this.teamId)),
      db
        .select()
        .from(amoCrmSyncLog)
        .where(eq(amoCrmSyncLog.teamId, this.teamId))
        .orderBy(desc(amoCrmSyncLog.startedAt))
        .limit(10),
    ]);

    const mappingsByType: Record<string, number> = {};
    for (const mapping of mappings) {
      const key = `${mapping.uonEntityType}_to_${mapping.amoEntityType}`;
      mappingsByType[key] = (mappingsByType[key] || 0) + 1;
    }

    return {
      lastSync: this.settings?.lastSyncAt || null,
      totalMappings: mappings.length,
      mappingsByType,
      recentLogs: logs,
    };
  }
}

/**
 * Создает экземпляр коннектора
 */
export async function createConnector(teamId: number): Promise<UonAmoCrmConnector | null> {
  const connector = new UonAmoCrmConnector(teamId);
  const initialized = await connector.initialize();
  return initialized ? connector : null;
}
