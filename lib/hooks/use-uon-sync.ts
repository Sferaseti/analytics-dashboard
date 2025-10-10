import { useState, useCallback } from 'react';

export interface SyncResults {
  tourists: {
    success: boolean;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    error?: string;
  };
  requests: {
    success: boolean;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    error?: string;
  };
}

export interface SyncStatus {
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
  results: SyncResults | null;
  warnings?: string[];
}

export function useUonSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isLoading: false,
    error: null,
    lastSync: null,
    results: null,
  });

  const syncData = useCallback(async () => {
    setStatus(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      warnings: undefined
    }));

    try {
      console.log('🔄 [useUonSync] Отправляем запрос на синхронизацию...');
      
      const response = await fetch('/api/uon/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📥 [useUonSync] Получен ответ:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Ошибка сервера`);
      }

      // Обновляем статус с результатами
      setStatus({
        isLoading: false,
        error: data.success ? null : (data.error || 'Синхронизация завершена с ошибками'),
        lastSync: new Date(),
        results: data.results,
        warnings: data.warnings,
      });

      console.log('✅ [useUonSync] Синхронизация завершена:', {
        success: data.success,
        warnings: data.warnings?.length || 0
      });

      return data.results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при синхронизации';
      console.error('❌ [useUonSync] Ошибка синхронизации:', errorMessage);
      
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        warnings: undefined
      }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      error: null,
      warnings: undefined
    }));
  }, []);

  return {
    ...status,
    syncData,
    clearError,
  };
}