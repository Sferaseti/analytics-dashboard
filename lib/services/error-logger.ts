import { db } from '@/lib/db/drizzle';
import { uonSyncLog } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export interface ErrorLogEntry {
  id?: string;
  operation: string;
  errorType: 'api_error' | 'sync_error' | 'validation_error' | 'network_error' | 'unknown_error';
  errorMessage: string;
  errorDetails?: string;
  apiEndpoint?: string;
  requestData?: any;
  responseData?: any;
  statusCode?: number;
  timestamp?: Date;
  teamId?: number; // Добавляем teamId как опциональный параметр
}

export class ErrorLogger {
  /**
   * Логирует ошибку в базу данных
   */
  static async logError(entry: ErrorLogEntry): Promise<void> {
    try {
      await db.insert(uonSyncLog).values({
        teamId: entry.teamId || 1, // Используем teamId из entry или дефолтное значение
        entityType: entry.operation,
        status: 'error',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errorMessage: entry.errorMessage,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      // Также логируем в консоль для разработки
      console.error(`[${entry.errorType}] ${entry.operation}:`, {
        message: entry.errorMessage,
        details: entry.errorDetails,
        endpoint: entry.apiEndpoint,
        statusCode: entry.statusCode,
        timestamp: new Date().toISOString(),
      });
    } catch (dbError) {
      // Если не удается записать в БД, логируем в консоль
      console.error('Failed to log error to database:', dbError);
      console.error('Original error:', entry);
    }
  }

  /**
   * Логирует ошибку API
   */
  static async logApiError(
    operation: string,
    endpoint: string,
    error: Error,
    statusCode?: number,
    requestData?: any,
    responseData?: any
  ): Promise<void> {
    await this.logError({
      operation,
      errorType: 'api_error',
      errorMessage: error.message,
      errorDetails: error.stack,
      apiEndpoint: endpoint,
      requestData,
      responseData,
      statusCode,
    });
  }

  /**
   * Логирует ошибку синхронизации
   */
  static async logSyncError(
    operation: string,
    error: Error,
    details?: string
  ): Promise<void> {
    await this.logError({
      operation,
      errorType: 'sync_error',
      errorMessage: error.message,
      errorDetails: details || error.stack,
    });
  }

  /**
   * Логирует ошибку валидации данных
   */
  static async logValidationError(
    operation: string,
    message: string,
    invalidData?: any
  ): Promise<void> {
    await this.logError({
      operation,
      errorType: 'validation_error',
      errorMessage: message,
      errorDetails: invalidData ? JSON.stringify(invalidData, null, 2) : undefined,
    });
  }

  /**
   * Логирует сетевую ошибку
   */
  static async logNetworkError(
    operation: string,
    endpoint: string,
    error: Error
  ): Promise<void> {
    await this.logError({
      operation,
      errorType: 'network_error',
      errorMessage: error.message,
      errorDetails: error.stack,
      apiEndpoint: endpoint,
    });
  }

  /**
   * Получает последние ошибки из лога
   */
  static async getRecentErrors(limit: number = 50): Promise<any[]> {
    try {
      const errors = await db
        .select()
        .from(uonSyncLog)
        .where(eq(uonSyncLog.status, 'error'))
        .orderBy(desc(uonSyncLog.startedAt))
        .limit(limit);

      return errors;
    } catch (error) {
      console.error('Failed to fetch recent errors:', error);
      return [];
    }
  }

  /**
   * Получает статистику ошибок за период
   */
  static async getErrorStats(hours: number = 24): Promise<{
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    recentErrors: any[];
  }> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const errors = await db
        .select()
        .from(uonSyncLog)
        .where(eq(uonSyncLog.status, 'error'))
        .orderBy(desc(uonSyncLog.startedAt));

      const recentErrors = errors.filter(error => 
        error.startedAt && error.startedAt >= since
      );

      const errorsByOperation = recentErrors.reduce((acc, error) => {
        acc[error.entityType] = (acc[error.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalErrors: recentErrors.length,
        errorsByOperation,
        recentErrors: recentErrors.slice(0, 10), // Последние 10 ошибок
      };
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        totalErrors: 0,
        errorsByOperation: {},
        recentErrors: [],
      };
    }
  }
}

/**
 * Утилита для обертывания асинхронных операций с автоматическим логированием ошибок
 */
export async function withErrorLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await ErrorLogger.logSyncError(operation, err);
    
    if (onError) {
      onError(err);
    }
    
    return null;
  }
}