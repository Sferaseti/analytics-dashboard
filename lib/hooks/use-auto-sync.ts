import { useState, useEffect, useCallback } from 'react';

export interface AutoSyncStatus {
  isRunning: boolean;
  config: {
    apiKey: string;
    intervalMinutes: number;
    enabled: boolean;
  } | null;
}

export interface UseAutoSyncReturn {
  status: AutoSyncStatus | null;
  isLoading: boolean;
  error: string | null;
  startAutoSync: (apiKey: string, intervalMinutes?: number) => Promise<void>;
  stopAutoSync: () => Promise<void>;
  updateConfig: (config: Partial<{ apiKey: string; intervalMinutes: number; enabled: boolean }>) => Promise<void>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
}

export function useAutoSync(): UseAutoSyncReturn {
  const [status, setStatus] = useState<AutoSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/uon/auto-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'status' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get auto-sync status');
      }

      setStatus(data.status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to get auto-sync status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startAutoSync = useCallback(async (apiKey: string, intervalMinutes: number = 60) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/uon/auto-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          config: {
            apiKey,
            intervalMinutes,
            enabled: true,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start auto-sync');
      }

      setStatus(data.status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to start auto-sync:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopAutoSync = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/uon/auto-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'stop' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop auto-sync');
      }

      setStatus(data.status || { isRunning: false, config: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to stop auto-sync:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (config: Partial<{ apiKey: string; intervalMinutes: number; enabled: boolean }>) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/uon/auto-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          config,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update auto-sync config');
      }

      setStatus(data.status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to update auto-sync config:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загружаем статус при монтировании компонента
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    status,
    isLoading,
    error,
    startAutoSync,
    stopAutoSync,
    updateConfig,
    refreshStatus,
    clearError,
  };
}