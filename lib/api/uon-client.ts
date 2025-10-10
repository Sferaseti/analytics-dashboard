/**
 * U-ON.RU API Client
 * Клиент для работы с API туристической CRM системы U-ON.RU
 */

export interface UonApiConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface UonRequest {
  id: number
  name: string
  country: string
  city: string
  departure_date: string
  return_date: string
  adults: number
  children: number
  total_amount: number
  status: 'new' | 'in_progress' | 'confirmed' | 'cancelled'
  manager_id: number
  created_at: string
}

export interface UonBill {
  id: number
  request_id: number
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
  paid_at?: string
}

export interface UonClient {
  id: number
  name: string
  email: string
  phone: string
  country: string
  created_at: string
  total_spent: number
  requests_count: number
}

export interface UonTourist {
  id: number
  name: string
  email: string
  phone: string
  country: string
  city: string
  birth_date: string
  passport_number: string
  created_at: string
  last_trip_date?: string
  total_trips: number
  total_spent: number
  status: 'active' | 'inactive'
}

export interface UonLead {
  id: number
  name: string
  email: string
  phone: string
  country_interest: string
  budget: number
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'lost'
  manager_id: number
  created_at: string
}

export interface UonManager {
  id: number
  name: string
  email: string
  department: string
  active_requests: number
  completed_requests: number
  total_sales: number
}

export interface UonCall {
  id: number
  phone: string
  direction: 'incoming' | 'outgoing'
  duration: number
  status: 'answered' | 'missed' | 'busy' | 'failed'
  call_date: string
  manager_id?: number
  client_id?: number
  tourist_id?: number
  recording_url?: string
  notes?: string
  created_at: string
}

export interface UonPagination {
  current_page: number
  total_pages: number
  total_items: number
  per_page: number
}

export interface UonApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: UonPagination
}

export class UonApiClient {
  private config: UonApiConfig
  private baseUrl: string
  private timeout: number
  private retryAttempts: number
  private retryDelay: number

  constructor(config: UonApiConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://api.u-on.ru'
    this.timeout = config.timeout || 30000 // 30 секунд по умолчанию
    this.retryAttempts = config.retryAttempts || 3
    this.retryDelay = config.retryDelay || 1000 // 1 секунда по умолчанию
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<UonApiResponse<T>> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const url = `${this.baseUrl}${endpoint}`
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers,
        }

        // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ - ЗАПРОС
        console.log(`🚀 [U-ON API] Запрос ${attempt + 1}/${this.retryAttempts + 1}:`)
        console.log(`   📍 URL: ${url}`)
        console.log(`   🔑 API Key: ${this.config.apiKey?.substring(0, 10)}...`)
        console.log(`   📋 Method: ${options.method || 'GET'}`)
        console.log(`   📦 Headers:`, headers)
        if (options.body) {
          console.log(`   📄 Body:`, options.body)
        }

        // Создаем AbortController для таймаута
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const startTime = Date.now()
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        })
        const duration = Date.now() - startTime

        clearTimeout(timeoutId)

        // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ - ОТВЕТ
        console.log(`📥 [U-ON API] Ответ получен за ${duration}ms:`)
        console.log(`   📊 Status: ${response.status} ${response.statusText}`)
        console.log(`   📋 Headers:`, Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          const errorText = await response.text()
          console.log(`   ❌ Error Body:`, errorText)
          
          // Специальная обработка ошибки 403 для неверного API ключа
          if (response.status === 403) {
            console.error(`🚨 [U-ON API] 403 Forbidden - детали:`, errorText)
            
            try {
              const errorJson = JSON.parse(errorText)
              if (errorJson.error?.message === 'API key is wrong') {
                return {
                  success: false,
                  error: `Неверный API ключ. Проверьте правильность ключа: ${this.config.apiKey.substring(0, 8)}...`,
                }
              }
            } catch (parseError) {
              // Если не JSON, используем текст как есть
            }
            
            return {
              success: false,
              error: `HTTP ${response.status}: ${response.statusText}. Возможно, неверный API ключ или нет прав доступа.`,
            }
          }
          
          // Если это 404 или другая клиентская ошибка, не повторяем запрос
          if (response.status >= 400 && response.status < 500) {
            console.log(`   🚫 Клиентская ошибка, повтор не требуется`)
            return {
              success: false,
              error: `HTTP ${response.status}: ${response.statusText}`,
            }
          }
          
          // Для серверных ошибок (5xx) повторяем запрос
          console.log(`   🔄 Серверная ошибка, будет повтор через ${this.retryDelay * (attempt + 1)}ms`)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const responseText = await response.text()
        console.log(`   📄 Response Body:`, responseText)
        
        let data
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.log(`   ⚠️ JSON Parse Error:`, parseError)
          data = responseText
        }

        console.log(`   ✅ Успешный ответ:`, data)
        
        // U-ON API возвращает данные в разных форматах в зависимости от endpoint
        let extractedData = data
        if (data && typeof data === 'object') {
          // Проверяем результат API для call_history
          if (endpoint.includes('/call_history/')) {
            // Если result: 404, это означает что страница не найдена
            if ('result' in data && data.result === 404) {
              return {
                success: false,
                error: 'HTTP 404: Not Found',
                data: [] as T
              }
            }
            // Для истории звонков данные находятся в поле 'users'
            if ('users' in data && Array.isArray(data.users)) {
              extractedData = data.users
            }
          } else if ('data' in data && Array.isArray(data.data)) {
            // Для других endpoint'ов данные находятся в поле 'data'
            extractedData = data.data
          }
        }
        
        return {
          success: true,
          data: extractedData,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.log(`   ❌ [U-ON API] Ошибка попытки ${attempt + 1}:`, lastError.message)
        
        // Если это последняя попытка, возвращаем ошибку
        if (attempt === this.retryAttempts) {
          console.log(`   🛑 Все попытки исчерпаны`)
          break
        }

        // Ждем перед следующей попыткой
        const delay = this.retryDelay * (attempt + 1)
        console.log(`   ⏳ Ожидание ${delay}ms перед следующей попыткой...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    console.log(`   💥 [U-ON API] Финальная ошибка:`, lastError?.message)
    return {
      success: false,
      error: lastError?.message || 'Неизвестная ошибка',
    }
  }

  // Методы для работы с заявками
  async getRequests(params?: {
    limit?: number
    offset?: number
    status?: string
    date_from?: string
    date_to?: string
  }): Promise<UonApiResponse<UonRequest[]>> {
    try {
      // Проверяем валидность API ключа
      if (!this.config.apiKey || this.config.apiKey.length < 10) {
        console.log('❌ [U-ON API] Невалидный API ключ для получения заявок')
        return {
          success: false,
          error: 'Не удалось получить данные заявок из API: невалидный API ключ',
          data: []
        }
      }

      // Используем официальный формат U-ON API: /{key}/requests/{date_from}/{date_to}/{page}.json
      const dateFrom = params?.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 дней назад
      const dateTo = params?.date_to || new Date().toISOString().split('T')[0] // сегодня
      const page = params?.offset ? Math.floor(params.offset / (params.limit || 20)) + 1 : 1
      
      const endpoint = `/${this.config.apiKey}/requests/${dateFrom}/${dateTo}/${page}.json`
      console.log(`[UonClient] Fetching requests from endpoint: ${endpoint} with date range: ${dateFrom} - ${dateTo}`)
      
      const response = await this.makeRequest<UonRequest[]>(endpoint, {
        method: 'GET', // Согласно документации, используется GET метод
      })
      console.log(`[UonClient] getRequests response:`, response)
      
      // Если API недоступен, возвращаем ошибку
      if (!response.success) {
        const errorMsg = response.error?.includes('403') || response.error?.includes('API key is wrong') 
          ? 'Не удалось получить данные заявок из API: неверный API ключ'
          : response.error?.includes('404')
          ? 'Не удалось получить данные заявок из API: записи не найдены'
          : `Не удалось получить данные заявок из API: ${response.error || 'неизвестная ошибка'}`;
        
        console.log('❌ [U-ON API] Ошибка получения заявок:', errorMsg)
        return {
          success: false,
          error: errorMsg,
          data: []
        }
      }

      return response
    } catch (error) {
      console.error('❌ [U-ON API] Критическая ошибка при получении заявок:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'неизвестная ошибка';
      return {
        success: false,
        error: `Не удалось получить данные заявок из API: ${errorMessage}`,
        data: []
      }
    }
  }

  async getRequest(id: number): Promise<UonApiResponse<UonRequest>> {
    return this.makeRequest<UonRequest>(`/${this.config.apiKey}/requests/${id}.json`, {
      method: 'POST',
      body: JSON.stringify({ id })
    })
  }

  async createRequest(request: Omit<UonRequest, 'id' | 'created_at'>): Promise<UonApiResponse<UonRequest>> {
    return this.makeRequest<UonRequest>(`/${this.config.apiKey}/requests.json`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async updateRequest(id: number, updates: Partial<UonRequest>): Promise<UonApiResponse<UonRequest>> {
    return this.makeRequest<UonRequest>(`/${this.config.apiKey}/requests/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // Методы для работы со счетами
  async getBills(params?: {
    limit?: number
    offset?: number
    status?: string
    request_id?: number
  }): Promise<UonApiResponse<UonBill[]>> {
    // Используем формат U-ON API: /{key}/bills/{page}.json
    const page = params?.offset ? Math.floor(params.offset / (params.limit || 20)) + 1 : 1
    return this.makeRequest<UonBill[]>(`/${this.config.apiKey}/bills/${page}.json`)
  }

  async getBill(id: number): Promise<UonApiResponse<UonBill>> {
    return this.makeRequest<UonBill>(`/${this.config.apiKey}/bills/${id}.json`)
  }

  async createBill(bill: Omit<UonBill, 'id' | 'created_at'>): Promise<UonApiResponse<UonBill>> {
    return this.makeRequest<UonBill>(`/${this.config.apiKey}/bills.json`, {
      method: 'POST',
      body: JSON.stringify(bill),
    })
  }

  // Методы для работы с клиентами
  async getClients(params?: {
    limit?: number
    offset?: number
    search?: string
  }): Promise<UonApiResponse<UonClient[]>> {
    // Используем формат U-ON API: /{key}/clients/{page}.json
    const page = params?.offset ? Math.floor(params.offset / (params.limit || 20)) + 1 : 1
    return this.makeRequest<UonClient[]>(`/${this.config.apiKey}/clients/${page}.json`)
  }

  async getClient(id: number): Promise<UonApiResponse<UonClient>> {
    return this.makeRequest<UonClient>(`/${this.config.apiKey}/clients/${id}.json`)
  }

  async createClient(client: Omit<UonClient, 'id' | 'created_at' | 'total_spent' | 'requests_count'>): Promise<UonApiResponse<UonClient>> {
    return this.makeRequest<UonClient>(`/${this.config.apiKey}/clients.json`, {
      method: 'POST',
      body: JSON.stringify(client),
    })
  }

  // Методы для работы с лидами
  async getLeads(params?: {
    limit?: number
    offset?: number
    status?: string
    manager_id?: number
  }): Promise<UonApiResponse<UonLead[]>> {
    // Используем формат U-ON API: /{key}/leads/{page}.json
    const page = params?.offset ? Math.floor(params.offset / (params.limit || 20)) + 1 : 1
    return this.makeRequest<UonLead[]>(`/${this.config.apiKey}/leads/${page}.json`)
  }

  async getLead(id: number): Promise<UonApiResponse<UonLead>> {
    return this.makeRequest<UonLead>(`/${this.config.apiKey}/leads/${id}.json`)
  }

  async createLead(lead: Omit<UonLead, 'id' | 'created_at'>): Promise<UonApiResponse<UonLead>> {
    return this.makeRequest<UonLead>(`/${this.config.apiKey}/leads.json`, {
      method: 'POST',
      body: JSON.stringify(lead),
    })
  }

  async updateLead(id: number, updates: Partial<UonLead>): Promise<UonApiResponse<UonLead>> {
    return this.makeRequest<UonLead>(`/${this.config.apiKey}/leads/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // Методы для работы с менеджерами
  async getManagers(): Promise<UonApiResponse<UonManager[]>> {
    return this.makeRequest<UonManager[]>(`/${this.config.apiKey}/managers/1.json`)
  }

  async getManager(id: number): Promise<UonApiResponse<UonManager>> {
    return this.makeRequest<UonManager>(`/${this.config.apiKey}/managers/${id}.json`)
  }

  // Методы для работы с туристами
  async getTourists(page: number = 1): Promise<UonApiResponse<UonTourist[]>> {
    const endpoint = `/${this.config.apiKey}/users/${page}.json`
    console.log(`[UonClient] Fetching tourists from endpoint: ${endpoint}`)
    
    try {
      const response = await this.makeRequest<UonTourist[]>(endpoint)
      console.log(`[UonClient] getTourists response:`, response)
      
      if (!response.success) {
        console.log(`[UonClient] getTourists received error response:`, response.error)
        return response
      }
      
      if (!response.data || !Array.isArray(response.data)) {
        console.log(`[UonClient] getTourists response data is not an array:`, typeof response.data, response.data)
        return {
          success: true,
          data: []
        }
      }
      
      console.log(`[UonClient] getTourists returning ${response.data.length} tourists`)
      return response
    } catch (error) {
      console.error(`[UonClient] Error in getTourists:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      }
    }
  }

  async getAllTourists(): Promise<UonApiResponse<UonTourist[]>> {
    try {
      console.log('🔍 [U-ON API] Получение всех туристов...')
      console.log('🔑 [U-ON API] API ключ:', this.config.apiKey ? `${this.config.apiKey.substring(0, 8)}...` : 'отсутствует')
      console.log('📏 [U-ON API] Длина API ключа:', this.config.apiKey?.length || 0)
      
      // Проверяем валидность API ключа
      if (!this.config.apiKey || this.config.apiKey.length < 10) {
        console.log('❌ [U-ON API] Невалидный API ключ для туристов')
        return {
          success: false,
          error: 'Невалидный API ключ. Проверьте настройки U-ON API.',
          data: []
        }
      }

      const allTourists: UonTourist[] = []
      let page = 1
      let hasMorePages = true

      while (hasMorePages) {
        console.log(`📄 [U-ON API] Загружаем страницу ${page}...`)
        
        const response = await this.getTourists(page)
        
        if (!response.success) {
          console.log('❌ [U-ON API] Ошибка получения данных о туристах:', response.error)
          return response
        }

        const tourists = response.data || []
        allTourists.push(...tourists)

        // Если получили меньше 100 записей, значит это последняя страница
        hasMorePages = tourists.length === 100
        page++

        // Защита от бесконечного цикла
        if (page > 1000) {
          console.warn('⚠️ [U-ON API] Достигнут лимит страниц (1000), прерываем загрузку')
          break
        }
      }

      console.log(`✅ [U-ON API] Загружено ${allTourists.length} туристов с ${page - 1} страниц`)
      
      return {
        success: true,
        data: allTourists,
        message: `Загружено ${allTourists.length} туристов`
      }
    } catch (error) {
      console.error('❌ [U-ON API] Ошибка при получении туристов:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка при получении туристов',
        data: []
      }
    }
  }

  // Методы для работы с историей звонков
  async getCallHistory(page: number = 1): Promise<UonApiResponse<UonCall[]>> {
    try {
      console.log(`🔍 [U-ON API] Получение истории звонков, страница ${page}...`)
      
      // Проверяем валидность API ключа
      if (!this.config.apiKey || this.config.apiKey.length < 10) {
        console.log('❌ [U-ON API] Невалидный API ключ для звонков')
        return {
          success: false,
          error: 'Невалидный API ключ. Проверьте настройки U-ON API.',
          data: []
        }
      }

      // Формируем endpoint согласно документации: /{key}/call_history/{page}.json
      const endpoint = `/${this.config.apiKey}/call_history/${page}.json`
      console.log(`📞 [U-ON API] Запрос к endpoint: ${endpoint}`)
      
      const response = await this.makeRequest<UonCall[]>(endpoint)
      
      if (!response.success) {
        console.log('❌ [U-ON API] Ошибка получения данных о звонках:', response.error)
        return response
      }

      // Проверяем результат API - если result: 404, значит страница не найдена
      if (response.data && typeof response.data === 'object' && 'result' in response.data) {
        const apiResult = (response.data as any).result
        if (apiResult === 404) {
          console.log('📞 [U-ON API] Страница не найдена (404), завершаем пагинацию')
          return {
            success: true,
            data: [],
            pagination: {
              current_page: page,
              total_pages: page - 1,
              total_items: 0,
              per_page: 0
            }
          }
        }
      }

      // Если данных нет, возвращаем пустой массив
      if (!response.data || response.data.length === 0) {
        console.log('📞 [U-ON API] Нет данных о звонках на странице', page)
        return {
          success: true,
          data: [],
          pagination: {
            current_page: page,
            total_pages: 0,
            total_items: 0,
            per_page: 0
          }
        }
      }
      
      console.log(`[UonClient] getCallHistory returning ${response.data.length} calls`)
      
      // Добавляем пагинацию если её нет в ответе
      if (!response.pagination) {
        response.pagination = {
          current_page: page,
          total_pages: 1,
          total_items: response.data.length,
          per_page: response.data.length
        }
      }
      
      return response
    } catch (error) {
      console.error(`[UonClient] Error in getCallHistory:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      }
    }
  }

  async getAllCallHistory(): Promise<UonApiResponse<UonCall[]>> {
    try {
      console.log('🔍 [U-ON API] Получение всей истории звонков...')
      
      // Проверяем валидность API ключа
      if (!this.config.apiKey || this.config.apiKey.length < 10) {
        console.log('❌ [U-ON API] Невалидный API ключ для получения всех звонков')
        return {
          success: false,
          error: 'Невалидный API ключ. Проверьте настройки U-ON API.',
          data: []
        }
      }

      const allCalls: UonCall[] = []
      let page = 1
      let hasMorePages = true

      while (hasMorePages) {
        console.log(`📄 [U-ON API] Загружаем страницу звонков ${page}...`)
        
        const response = await this.getCallHistory(page)
        
        if (!response.success) {
          console.log('❌ [U-ON API] Ошибка получения данных о звонках на странице', page, ':', response.error)
          return response
        }

        const calls = response.data || []
        allCalls.push(...calls)

        // Если получили меньше 100 записей, значит это последняя страница
        hasMorePages = calls.length === 100
        page++

        // Защита от бесконечного цикла
        if (page > 1000) {
          console.warn('⚠️ [U-ON API] Достигнут лимит страниц (1000), прерываем загрузку звонков')
          break
        }
      }

      console.log(`✅ [U-ON API] Загружено ${allCalls.length} звонков с ${page - 1} страниц`)
      
      return {
        success: true,
        data: allCalls,
        message: `Загружено ${allCalls.length} звонков`
      }
    } catch (error) {
      console.error('❌ [U-ON API] Ошибка при получении истории звонков:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка при получении звонков',
        data: []
      }
    }
  }

  // Аналитические методы
  async getAnalytics(params: {
    type: 'requests' | 'sales' | 'countries' | 'leads' | 'managers'
    date_from?: string
    date_to?: string
    group_by?: 'day' | 'week' | 'month'
  }): Promise<UonApiResponse<any>> {
    // Используем формат U-ON API: /{key}/analytics/{type}/1.json
    return this.makeRequest<any>(`/${this.config.apiKey}/analytics/${params.type}/1.json`)
  }

  // Метод для проверки подключения
  async testConnection(): Promise<UonApiResponse<any>> {
    try {
      // Валидация API ключа
      if (!this.config.apiKey) {
        return {
          success: false,
          error: 'API ключ не указан. Пожалуйста, введите корректный API ключ в настройках.',
          data: null
        }
      }

      if (this.config.apiKey.length < 10) {
        return {
          success: false,
          error: 'API ключ слишком короткий. Корректный API ключ должен содержать не менее 10 символов.',
          data: null
        }
      }

      // Проверяем формат API ключа (должен содержать только буквы и цифры)
      if (!/^[a-zA-Z0-9]+$/.test(this.config.apiKey)) {
        return {
          success: false,
          error: 'Неверный формат API ключа. API ключ должен содержать только буквы и цифры.',
          data: null
        }
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await this.makeRequest<any>(`/${this.config.apiKey}/ping.json`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        return response
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Превышено время ожидания ответа от API (10 секунд). Проверьте подключение к интернету.',
            data: null
          }
        }
        return {
          success: false,
          error: `Ошибка подключения к API: ${error.message}`,
          data: null
        }
      }
      return {
        success: false,
        error: 'Неизвестная ошибка при тестировании подключения к API',
        data: null
      }
    }
  }


}

// Экспорт экземпляра клиента для использования в приложении
let uonClient: UonApiClient | null = null

export function initUonClient(config: UonApiConfig): UonApiClient {
  uonClient = new UonApiClient(config)
  return uonClient
}

export function getUonClient(): UonApiClient | null {
  return uonClient
}

// Хук для использования в React компонентах
export function useUonApi() {
  const client = getUonClient()
  
  if (!client) {
    throw new Error('U-ON API client not initialized. Call initUonClient first.')
  }

  return client
}