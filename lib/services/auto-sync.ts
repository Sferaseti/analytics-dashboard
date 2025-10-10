import { createImportService } from './uon-import';

export interface AutoSyncConfig {
  apiKey: string;
  teamId: number;
  intervalMinutes: number;
  enabled: boolean;
}

export class AutoSyncService {
  private config: AutoSyncConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: AutoSyncConfig) {
    this.config = config;
  }

  /**
   * Запускает автоматическую синхронизацию
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    console.log(`Starting auto-sync with interval: ${this.config.intervalMinutes} minutes`);
    
    this.isRunning = true;
    
    // Запускаем первую синхронизацию сразу
    this.runSync();
    
    // Устанавливаем интервал для последующих синхронизаций
    this.intervalId = setInterval(() => {
      this.runSync();
    }, this.config.intervalMinutes * 60 * 1000);
  }

  /**
   * Останавливает автоматическую синхронизацию
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping auto-sync');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }

  /**
   * Обновляет конфигурацию автосинхронизации
   */
  updateConfig(newConfig: Partial<AutoSyncConfig>): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning && this.config.enabled) {
      this.start();
    }
  }

  /**
   * Возвращает текущий статус автосинхронизации
   */
  getStatus(): { isRunning: boolean; config: AutoSyncConfig } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config }
    };
  }

  /**
   * Выполняет одну синхронизацию
   */
  private async runSync(): Promise<void> {
    try {
      console.log('Running scheduled sync...');
      
      const importService = createImportService(this.config.apiKey, this.config.teamId);
      const results = await importService.importAll();
      
      console.log('Scheduled sync completed:', results);
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  }
}

// Глобальный экземпляр автосинхронизации
let globalAutoSync: AutoSyncService | null = null;

/**
 * Получает или создает глобальный экземпляр автосинхронизации
 */
export function getAutoSyncService(config?: AutoSyncConfig): AutoSyncService {
  if (!globalAutoSync && config) {
    globalAutoSync = new AutoSyncService(config);
  } else if (globalAutoSync && config) {
    globalAutoSync.updateConfig(config);
  }
  
  if (!globalAutoSync) {
    throw new Error('AutoSyncService not initialized. Provide config on first call.');
  }
  
  return globalAutoSync;
}

/**
 * Инициализирует автосинхронизацию с настройками по умолчанию
 */
export function initAutoSync(apiKey: string, teamId: number, intervalMinutes: number = 60): AutoSyncService {
  const config: AutoSyncConfig = {
    apiKey,
    teamId,
    intervalMinutes,
    enabled: true
  };
  
  return getAutoSyncService(config);
}