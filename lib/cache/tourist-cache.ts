/**
 * Система кэширования данных туристов с автоматическим обновлением
 * Tourist data caching system with automatic updates
 */

import { UonTourist } from '../api/uon-client'
import { getFallbackTouristData } from './fallback-data'

export interface TouristCacheData {
  tourists: UonTourist[]
  totalCount: number
  lastUpdated: string
  nextUpdate: string
}

export interface CacheStats {
  totalTourists: number
  activeTourists: number
  inactiveTourists: number
  lastUpdated: string
  nextUpdate: string
  cacheHit: boolean
}

class TouristCache {
  private static instance: TouristCache
  private cacheKey = 'uon_tourist_cache'
  private updateInterval = 60 * 60 * 1000 // 1 час в миллисекундах
  private updateTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.initializeCache()
  }

  public static getInstance(): TouristCache {
    if (!TouristCache.instance) {
      TouristCache.instance = new TouristCache()
    }
    return TouristCache.instance
  }

  private initializeCache(): void {
    // Проверяем, есть ли кэшированные данные
    const cachedData = this.getCachedData()
    
    if (cachedData) {
      console.log('Найдены кэшированные данные туристов:', {
        count: cachedData.totalCount,
        lastUpdated: cachedData.lastUpdated,
        nextUpdate: cachedData.nextUpdate
      })

      // Проверяем, не истек ли кэш
      if (this.isCacheExpired(cachedData)) {
        console.log('Кэш туристов истек, требуется обновление с API ключом команды')
      } else {
        console.log('Кэш туристов актуален')
      }
    } else {
      console.log('Кэшированные данные туристов не найдены')
      // Используем fallback данные
      const fallbackData = getFallbackTouristData()
      this.setCachedData(fallbackData)
    }
  }

  private getCachedData(): TouristCacheData | null {
    // Проверяем, что мы в браузере
    if (typeof window === 'undefined' || !window.localStorage) {
      return null
    }

    try {
      const cached = localStorage.getItem(this.cacheKey)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Ошибка при чтении кэша туристов:', error)
      return null
    }
  }

  private setCachedData(data: TouristCacheData): void {
    // Проверяем, что мы в браузере
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(data))
    } catch (error) {
      console.error('Ошибка при сохранении кэша туристов:', error)
    }
  }

  private isCacheExpired(data: TouristCacheData): boolean {
    return new Date(data.nextUpdate).getTime() <= Date.now()
  }

  private scheduleUpdate(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
    }
    
    // Не планируем автоматические обновления, так как нужен контекст команды
  }

  // Обновление кэша теперь требует передачи API ключа команды
  private async updateCacheWithApiKey(teamApiKey: string): Promise<void> {
    try {
      // Динамический импорт для избежания циклических зависимостей
      const { UonApiClient } = await import('../api/uon-client')
      const client = new UonApiClient({ 
        apiKey: teamApiKey,
        baseUrl: process.env.UON_API_URL || 'https://api.u-on.ru'
      })

      console.log('Обновление кэша туристов с API ключом команды...')
      const response = await client.getAllTourists()

      if (response.success && response.data) {
        const now = new Date()
        const nextUpdate = new Date(now.getTime() + this.updateInterval)

        const cacheData: TouristCacheData = {
          tourists: response.data,
          totalCount: response.data.length,
          lastUpdated: now.toISOString(),
          nextUpdate: nextUpdate.toISOString()
        }

        this.setCachedData(cacheData)
        console.log(`Кэш туристов обновлен: ${response.data.length} записей`)

        // Уведомляем подписчиков об обновлении только при успешном API ответе
        this.notifySubscribers(cacheData)
      } else {
        console.error('Ошибка при обновлении кэша туристов:', response.error)
        // Используем fallback данные при ошибке API, но НЕ уведомляем подписчиков
        const fallbackData = getFallbackTouristData()
        this.setCachedData(fallbackData)
      }
    } catch (error) {
      console.error('Критическая ошибка при обновлении кэша туристов:', error)
      // Используем fallback данные при критической ошибке, но НЕ уведомляем подписчиков
      const fallbackData = getFallbackTouristData()
      this.setCachedData(fallbackData)
    }
  }

  private subscribers: Array<(data: TouristCacheData) => void> = []

  public subscribe(callback: (data: TouristCacheData) => void): () => void {
    this.subscribers.push(callback)
    
    // Возвращаем функцию для отписки
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  private notifySubscribers(data: TouristCacheData): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Ошибка в подписчике кэша туристов:', error)
      }
    })
  }

  // Получение туристов теперь требует API ключ команды для обновления
  public async getTourists(teamApiKey?: string): Promise<TouristCacheData> {
    const cachedData = this.getCachedData()
    
    if (cachedData && !this.isCacheExpired(cachedData)) {
      console.log('Возвращаем кэшированные данные туристов')
      return cachedData
    }

    // Если кэш истек и есть API ключ команды, обновляем
    if (teamApiKey) {
      console.log('Кэш истек, обновляем с API ключом команды...')
      await this.updateCacheWithApiKey(teamApiKey)
      
      const updatedData = this.getCachedData()
      if (updatedData) {
        return updatedData
      }
    }

    // Если нет API ключа или обновление не удалось, возвращаем fallback данные
    console.log('Используем fallback данные туристов')
    const fallbackData = getFallbackTouristData()
    
    if (!cachedData) {
      this.setCachedData(fallbackData)
    }
    
    return fallbackData
  }

  public getStats(): CacheStats {
    const data = this.getCachedData()
    
    if (!data) {
      const fallbackData = getFallbackTouristData()
      return {
        totalTourists: fallbackData.totalCount,
        activeTourists: fallbackData.tourists.filter(t => t.status === 'active').length,
        inactiveTourists: fallbackData.tourists.filter(t => t.status === 'inactive').length,
        lastUpdated: fallbackData.lastUpdated,
        nextUpdate: fallbackData.nextUpdate,
        cacheHit: false
      }
    }

    return {
      totalTourists: data.totalCount,
      activeTourists: data.tourists.filter(t => t.status === 'active').length,
      inactiveTourists: data.tourists.filter(t => t.status === 'inactive').length,
      lastUpdated: data.lastUpdated,
      nextUpdate: data.nextUpdate,
      cacheHit: true
    }
  }

  // Принудительное обновление теперь требует API ключ команды
  public async forceUpdate(teamApiKey: string): Promise<void> {
    await this.updateCacheWithApiKey(teamApiKey)
  }

  public clearCache(): void {
    try {
      localStorage.removeItem(this.cacheKey)
      console.log('Кэш туристов очищен')
    } catch (error) {
      console.error('Ошибка при очистке кэша туристов:', error)
    }
  }

  public destroy(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
    }
  }
}

// Экспортируем singleton instance
export const touristCache = TouristCache.getInstance()

// Хук для использования в React компонентах
export function useTouristCache() {
  return touristCache
}