/**
 * Yandex Cloud Sync Service
 * Сервис для синхронизации данных U-ON с Yandex Cloud
 *
 * Функции:
 * - Экспорт данных U-ON в Object Storage
 * - Резервное копирование данных
 * - Генерация отчетов для DataLens
 */

import { db } from '@/lib/db/drizzle'
import {
  uonTourists,
  uonRequests,
  uonBills,
  uonClients,
  uonLeads,
  uonManagers,
  uonCallHistory,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  YandexCloudStorageClient,
  YandexCloudStorageConfig,
  YandexCloudApiResponse,
} from '@/lib/api/yandex-cloud-client'

export interface YandexCloudSyncConfig {
  storageConfig: YandexCloudStorageConfig
  teamId: number
  exportPrefix?: string
  backupEnabled?: boolean
  backupRetentionDays?: number
}

export interface ExportResult {
  entityType: string
  recordsExported: number
  fileKey: string
  fileSize: number
  exportedAt: string
}

export interface BackupResult {
  backupId: string
  entities: ExportResult[]
  totalRecords: number
  totalSize: number
  createdAt: string
}

export class YandexCloudSyncService {
  private config: YandexCloudSyncConfig
  private storage: YandexCloudStorageClient
  private exportPrefix: string

  constructor(config: YandexCloudSyncConfig) {
    this.config = config
    this.storage = new YandexCloudStorageClient(config.storageConfig)
    this.exportPrefix = config.exportPrefix || `team-${config.teamId}`
  }

  /**
   * Экспорт туристов в Object Storage
   */
  async exportTourists(): Promise<YandexCloudApiResponse<ExportResult>> {
    try {
      console.log(`[YC Sync] Экспорт туристов для команды ${this.config.teamId}...`)

      const tourists = await db
        .select()
        .from(uonTourists)
        .where(eq(uonTourists.teamId, this.config.teamId))

      const data = JSON.stringify(tourists, null, 2)
      const key = `${this.exportPrefix}/tourists/${this.getDateKey()}.json`

      const uploadResult = await this.storage.uploadFile(key, data, 'application/json')

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        }
      }

      const result: ExportResult = {
        entityType: 'tourists',
        recordsExported: tourists.length,
        fileKey: key,
        fileSize: Buffer.byteLength(data, 'utf8'),
        exportedAt: new Date().toISOString(),
      }

      console.log(`[YC Sync] Экспортировано ${tourists.length} туристов в ${key}`)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error('[YC Sync] Ошибка экспорта туристов:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      }
    }
  }

  /**
   * Экспорт заявок в Object Storage
   */
  async exportRequests(): Promise<YandexCloudApiResponse<ExportResult>> {
    try {
      console.log(`[YC Sync] Экспорт заявок для команды ${this.config.teamId}...`)

      const requests = await db
        .select()
        .from(uonRequests)
        .where(eq(uonRequests.teamId, this.config.teamId))

      const data = JSON.stringify(requests, null, 2)
      const key = `${this.exportPrefix}/requests/${this.getDateKey()}.json`

      const uploadResult = await this.storage.uploadFile(key, data, 'application/json')

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        }
      }

      const result: ExportResult = {
        entityType: 'requests',
        recordsExported: requests.length,
        fileKey: key,
        fileSize: Buffer.byteLength(data, 'utf8'),
        exportedAt: new Date().toISOString(),
      }

      console.log(`[YC Sync] Экспортировано ${requests.length} заявок в ${key}`)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error('[YC Sync] Ошибка экспорта заявок:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      }
    }
  }

  /**
   * Экспорт счетов в Object Storage
   */
  async exportBills(): Promise<YandexCloudApiResponse<ExportResult>> {
    try {
      console.log(`[YC Sync] Экспорт счетов для команды ${this.config.teamId}...`)

      const bills = await db
        .select()
        .from(uonBills)
        .where(eq(uonBills.teamId, this.config.teamId))

      const data = JSON.stringify(bills, null, 2)
      const key = `${this.exportPrefix}/bills/${this.getDateKey()}.json`

      const uploadResult = await this.storage.uploadFile(key, data, 'application/json')

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        }
      }

      const result: ExportResult = {
        entityType: 'bills',
        recordsExported: bills.length,
        fileKey: key,
        fileSize: Buffer.byteLength(data, 'utf8'),
        exportedAt: new Date().toISOString(),
      }

      console.log(`[YC Sync] Экспортировано ${bills.length} счетов в ${key}`)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error('[YC Sync] Ошибка экспорта счетов:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      }
    }
  }

  /**
   * Экспорт клиентов в Object Storage
   */
  async exportClients(): Promise<YandexCloudApiResponse<ExportResult>> {
    try {
      console.log(`[YC Sync] Экспорт клиентов для команды ${this.config.teamId}...`)

      const clients = await db
        .select()
        .from(uonClients)
        .where(eq(uonClients.teamId, this.config.teamId))

      const data = JSON.stringify(clients, null, 2)
      const key = `${this.exportPrefix}/clients/${this.getDateKey()}.json`

      const uploadResult = await this.storage.uploadFile(key, data, 'application/json')

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        }
      }

      const result: ExportResult = {
        entityType: 'clients',
        recordsExported: clients.length,
        fileKey: key,
        fileSize: Buffer.byteLength(data, 'utf8'),
        exportedAt: new Date().toISOString(),
      }

      console.log(`[YC Sync] Экспортировано ${clients.length} клиентов в ${key}`)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error('[YC Sync] Ошибка экспорта клиентов:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      }
    }
  }

  /**
   * Экспорт лидов в Object Storage
   */
  async exportLeads(): Promise<YandexCloudApiResponse<ExportResult>> {
    try {
      console.log(`[YC Sync] Экспорт лидов для команды ${this.config.teamId}...`)

      const leads = await db
        .select()
        .from(uonLeads)
        .where(eq(uonLeads.teamId, this.config.teamId))

      const data = JSON.stringify(leads, null, 2)
      const key = `${this.exportPrefix}/leads/${this.getDateKey()}.json`

      const uploadResult = await this.storage.uploadFile(key, data, 'application/json')

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        }
      }

      const result: ExportResult = {
        entityType: 'leads',
        recordsExported: leads.length,
        fileKey: key,
        fileSize: Buffer.byteLength(data, 'utf8'),
        exportedAt: new Date().toISOString(),
      }

      console.log(`[YC Sync] Экспортировано ${leads.length} лидов в ${key}`)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error('[YC Sync] Ошибка экспорта лидов:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      }
    }
  }

  /**
   * Экспорт менеджеров в Object Storage
   */
  async exportManagers(): Promise<YandexCloudApiResponse<ExportResult>> {
    try {
      console.log(`[YC Sync] Экспорт менеджеров для команды ${this.config.teamId}...`)

      const managers = await db
        .select()
        .from(uonManagers)
        .where(eq(uonManagers.teamId, this.config.teamId))

      const data = JSON.stringify(managers, null, 2)
      const key = `${this.exportPrefix}/managers/${this.getDateKey()}.json`

      const uploadResult = await this.storage.uploadFile(key, data, 'application/json')

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        }
      }

      const result: ExportResult = {
        entityType: 'managers',
        recordsExported: managers.length,
        fileKey: key,
        fileSize: Buffer.byteLength(data, 'utf8'),
        exportedAt: new Date().toISOString(),
      }

      console.log(`[YC Sync] Экспортировано ${managers.length} менеджеров в ${key}`)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error('[YC Sync] Ошибка экспорта менеджеров:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      }
    }
  }

  /**
   * Экспорт истории звонков в Object Storage
   */
  async exportCallHistory(): Promise<YandexCloudApiResponse<ExportResult>> {
    try {
      console.log(`[YC Sync] Экспорт истории звонков для команды ${this.config.teamId}...`)

      const calls = await db
        .select()
        .from(uonCallHistory)
        .where(eq(uonCallHistory.teamId, this.config.teamId))

      const data = JSON.stringify(calls, null, 2)
      const key = `${this.exportPrefix}/call-history/${this.getDateKey()}.json`

      const uploadResult = await this.storage.uploadFile(key, data, 'application/json')

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        }
      }

      const result: ExportResult = {
        entityType: 'call_history',
        recordsExported: calls.length,
        fileKey: key,
        fileSize: Buffer.byteLength(data, 'utf8'),
        exportedAt: new Date().toISOString(),
      }

      console.log(`[YC Sync] Экспортировано ${calls.length} звонков в ${key}`)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error('[YC Sync] Ошибка экспорта истории звонков:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      }
    }
  }

  /**
   * Полный экспорт всех данных
   */
  async exportAll(): Promise<YandexCloudApiResponse<ExportResult[]>> {
    console.log(`[YC Sync] Начало полного экспорта для команды ${this.config.teamId}...`)

    const results: ExportResult[] = []
    const errors: string[] = []

    // Экспортируем все сущности
    const exportFunctions = [
      { name: 'tourists', fn: () => this.exportTourists() },
      { name: 'requests', fn: () => this.exportRequests() },
      { name: 'bills', fn: () => this.exportBills() },
      { name: 'clients', fn: () => this.exportClients() },
      { name: 'leads', fn: () => this.exportLeads() },
      { name: 'managers', fn: () => this.exportManagers() },
      { name: 'call_history', fn: () => this.exportCallHistory() },
    ]

    for (const { name, fn } of exportFunctions) {
      const result = await fn()
      if (result.success && result.data) {
        results.push(result.data)
      } else {
        errors.push(`${name}: ${result.error}`)
      }
    }

    if (errors.length > 0) {
      console.error('[YC Sync] Ошибки экспорта:', errors)
    }

    console.log(`[YC Sync] Полный экспорт завершен. Успешно: ${results.length}, Ошибок: ${errors.length}`)

    return {
      success: errors.length === 0,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      message: `Экспортировано ${results.length} сущностей`,
    }
  }

  /**
   * Создание полного бэкапа
   */
  async createBackup(): Promise<YandexCloudApiResponse<BackupResult>> {
    const backupId = `backup-${Date.now()}`
    console.log(`[YC Sync] Создание бэкапа ${backupId}...`)

    // Экспортируем все данные
    const exportResult = await this.exportAll()

    if (!exportResult.success || !exportResult.data) {
      return {
        success: false,
        error: exportResult.error || 'Export failed',
      }
    }

    // Создаем манифест бэкапа
    const manifest: BackupResult = {
      backupId,
      entities: exportResult.data,
      totalRecords: exportResult.data.reduce((sum, e) => sum + e.recordsExported, 0),
      totalSize: exportResult.data.reduce((sum, e) => sum + e.fileSize, 0),
      createdAt: new Date().toISOString(),
    }

    // Сохраняем манифест
    const manifestKey = `${this.exportPrefix}/backups/${backupId}/manifest.json`
    const manifestData = JSON.stringify(manifest, null, 2)

    const manifestUpload = await this.storage.uploadFile(
      manifestKey,
      manifestData,
      'application/json'
    )

    if (!manifestUpload.success) {
      return {
        success: false,
        error: `Failed to save backup manifest: ${manifestUpload.error}`,
      }
    }

    console.log(`[YC Sync] Бэкап ${backupId} создан успешно`)

    return {
      success: true,
      data: manifest,
    }
  }

  /**
   * Получение списка бэкапов
   */
  async listBackups(): Promise<YandexCloudApiResponse<BackupResult[]>> {
    try {
      const prefix = `${this.exportPrefix}/backups/`
      const listResult = await this.storage.listFiles(prefix)

      if (!listResult.success || !listResult.data) {
        return {
          success: false,
          error: listResult.error,
        }
      }

      // Фильтруем только манифесты
      const manifestFiles = listResult.data.filter((f) => f.key.endsWith('/manifest.json'))

      const backups: BackupResult[] = []

      for (const file of manifestFiles) {
        const downloadResult = await this.storage.downloadFile(file.key)
        if (downloadResult.success && downloadResult.data) {
          try {
            const manifest = JSON.parse(downloadResult.data.toString('utf8'))
            backups.push(manifest)
          } catch (parseError) {
            console.error(`[YC Sync] Ошибка парсинга манифеста ${file.key}:`, parseError)
          }
        }
      }

      // Сортируем по дате создания (новые первые)
      backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return {
        success: true,
        data: backups,
      }
    } catch (error) {
      console.error('[YC Sync] Ошибка получения списка бэкапов:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Экспорт данных для DataLens
   * Создает CSV файлы, оптимизированные для импорта в Yandex DataLens
   */
  async exportForDataLens(): Promise<YandexCloudApiResponse<ExportResult[]>> {
    console.log(`[YC Sync] Экспорт данных для DataLens...`)

    const results: ExportResult[] = []

    try {
      // Экспорт заявок в CSV
      const requests = await db
        .select()
        .from(uonRequests)
        .where(eq(uonRequests.teamId, this.config.teamId))

      const requestsCsv = this.toCSV(requests, [
        'id', 'uonId', 'name', 'country', 'city',
        'departureDate', 'returnDate', 'adults', 'children',
        'totalAmount', 'status', 'managerId', 'createdAt'
      ])

      const requestsKey = `${this.exportPrefix}/datalens/requests.csv`
      const requestsUpload = await this.storage.uploadFile(requestsKey, requestsCsv, 'text/csv')

      if (requestsUpload.success) {
        results.push({
          entityType: 'requests_datalens',
          recordsExported: requests.length,
          fileKey: requestsKey,
          fileSize: Buffer.byteLength(requestsCsv, 'utf8'),
          exportedAt: new Date().toISOString(),
        })
      }

      // Экспорт истории звонков в CSV
      const calls = await db
        .select()
        .from(uonCallHistory)
        .where(eq(uonCallHistory.teamId, this.config.teamId))

      const callsCsv = this.toCSV(calls, [
        'id', 'uonId', 'clientId', 'managerId', 'direction',
        'phone', 'start', 'duration', 'createdAt'
      ])

      const callsKey = `${this.exportPrefix}/datalens/call_history.csv`
      const callsUpload = await this.storage.uploadFile(callsKey, callsCsv, 'text/csv')

      if (callsUpload.success) {
        results.push({
          entityType: 'call_history_datalens',
          recordsExported: calls.length,
          fileKey: callsKey,
          fileSize: Buffer.byteLength(callsCsv, 'utf8'),
          exportedAt: new Date().toISOString(),
        })
      }

      // Экспорт счетов в CSV
      const bills = await db
        .select()
        .from(uonBills)
        .where(eq(uonBills.teamId, this.config.teamId))

      const billsCsv = this.toCSV(bills, [
        'id', 'uonId', 'requestId', 'amount', 'currency',
        'status', 'paidAt', 'createdAt'
      ])

      const billsKey = `${this.exportPrefix}/datalens/bills.csv`
      const billsUpload = await this.storage.uploadFile(billsKey, billsCsv, 'text/csv')

      if (billsUpload.success) {
        results.push({
          entityType: 'bills_datalens',
          recordsExported: bills.length,
          fileKey: billsKey,
          fileSize: Buffer.byteLength(billsCsv, 'utf8'),
          exportedAt: new Date().toISOString(),
        })
      }

      console.log(`[YC Sync] Экспорт для DataLens завершен. Файлов: ${results.length}`)

      return {
        success: true,
        data: results,
      }
    } catch (error) {
      console.error('[YC Sync] Ошибка экспорта для DataLens:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      }
    }
  }

  /**
   * Генерация presigned URL для скачивания экспортированного файла
   */
  async getDownloadUrl(fileKey: string, expiresIn: number = 3600): Promise<YandexCloudApiResponse<string>> {
    return this.storage.getPresignedUrl(fileKey, expiresIn)
  }

  /**
   * Утилита: конвертация массива объектов в CSV
   */
  private toCSV(data: Record<string, unknown>[], columns: string[]): string {
    if (data.length === 0) {
      return columns.join(',') + '\n'
    }

    const header = columns.join(',')
    const rows = data.map((row) => {
      return columns.map((col) => {
        const value = row[col]
        if (value === null || value === undefined) {
          return ''
        }
        const stringValue = String(value)
        // Экранируем кавычки и оборачиваем в кавычки если есть запятые или переносы
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    })

    return [header, ...rows].join('\n')
  }

  /**
   * Утилита: получение ключа даты для имени файла
   */
  private getDateKey(): string {
    const now = new Date()
    return now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '-')
  }
}

/**
 * Фабрика для создания сервиса синхронизации
 */
export function createYandexCloudSyncService(
  teamId: number,
  storageConfig: YandexCloudStorageConfig,
  options?: {
    exportPrefix?: string
    backupEnabled?: boolean
    backupRetentionDays?: number
  }
): YandexCloudSyncService {
  return new YandexCloudSyncService({
    teamId,
    storageConfig,
    ...options,
  })
}
