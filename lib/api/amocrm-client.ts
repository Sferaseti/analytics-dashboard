/**
 * amoCRM API Client
 * Клиент для работы с API CRM системы amoCRM
 * Документация: https://www.amocrm.ru/developers/content/crm_platform/api-reference
 */

export interface AmoCrmConfig {
  subdomain: string           // Субдомен аккаунта (example.amocrm.ru)
  clientId: string            // Client ID из интеграции
  clientSecret: string        // Client Secret из интеграции
  redirectUri: string         // Redirect URI
  accessToken?: string        // Access токен
  refreshToken?: string       // Refresh токен
  expiresAt?: number          // Время истечения access токена (timestamp)
}

export interface AmoCrmTokenResponse {
  token_type: string
  expires_in: number
  access_token: string
  refresh_token: string
}

export interface AmoCrmContact {
  id?: number
  name: string
  first_name?: string
  last_name?: string
  responsible_user_id?: number
  group_id?: number
  created_by?: number
  updated_by?: number
  created_at?: number
  updated_at?: number
  closest_task_at?: number
  is_deleted?: boolean
  is_unsorted?: boolean
  custom_fields_values?: AmoCrmCustomField[]
  account_id?: number
  _embedded?: {
    tags?: AmoCrmTag[]
    leads?: AmoCrmLead[]
    companies?: AmoCrmCompany[]
  }
}

export interface AmoCrmLead {
  id?: number
  name: string
  price?: number
  responsible_user_id?: number
  group_id?: number
  status_id?: number
  pipeline_id?: number
  loss_reason_id?: number
  created_by?: number
  updated_by?: number
  created_at?: number
  updated_at?: number
  closed_at?: number
  closest_task_at?: number
  is_deleted?: boolean
  custom_fields_values?: AmoCrmCustomField[]
  score?: number
  account_id?: number
  labor_cost?: number
  _embedded?: {
    tags?: AmoCrmTag[]
    contacts?: AmoCrmContact[]
    companies?: AmoCrmCompany[]
    catalog_elements?: any[]
  }
}

export interface AmoCrmCompany {
  id?: number
  name: string
  responsible_user_id?: number
  group_id?: number
  created_by?: number
  updated_by?: number
  created_at?: number
  updated_at?: number
  closest_task_at?: number
  is_deleted?: boolean
  custom_fields_values?: AmoCrmCustomField[]
  account_id?: number
  _embedded?: {
    tags?: AmoCrmTag[]
    contacts?: AmoCrmContact[]
  }
}

export interface AmoCrmTag {
  id?: number
  name: string
  color?: string
}

export interface AmoCrmCustomField {
  field_id: number
  field_name?: string
  field_code?: string
  field_type?: string
  values: {
    value: string | number | boolean
    enum_id?: number
    enum_code?: string
  }[]
}

export interface AmoCrmNote {
  id?: number
  entity_id: number
  created_by?: number
  updated_by?: number
  created_at?: number
  updated_at?: number
  responsible_user_id?: number
  group_id?: number
  note_type: string
  params: {
    text?: string
    service?: string
    phone?: string
    duration?: number
    source?: string
    link?: string
    uniq?: string
  }
  account_id?: number
}

export interface AmoCrmTask {
  id?: number
  created_by?: number
  updated_by?: number
  created_at?: number
  updated_at?: number
  responsible_user_id: number
  group_id?: number
  entity_id: number
  entity_type: 'leads' | 'contacts' | 'companies' | 'customers'
  is_completed?: boolean
  task_type_id?: number
  text: string
  duration?: number
  complete_till: number
  result?: {
    text?: string
  }
  account_id?: number
}

export interface AmoCrmPipeline {
  id: number
  name: string
  sort: number
  is_main: boolean
  is_unsorted_on: boolean
  is_archive: boolean
  account_id: number
  _embedded: {
    statuses: AmoCrmStatus[]
  }
}

export interface AmoCrmStatus {
  id: number
  name: string
  sort: number
  is_editable: boolean
  pipeline_id: number
  color: string
  type: number
  account_id: number
}

export interface AmoCrmUser {
  id: number
  name: string
  email: string
  lang: string
  rights: {
    leads: string
    contacts: string
    companies: string
    tasks: string
  }
}

export interface AmoCrmPagination {
  _page: number
  _links: {
    self: { href: string }
    next?: { href: string }
    prev?: { href: string }
  }
}

export interface AmoCrmApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: AmoCrmPagination
}

export class AmoCrmApiClient {
  private config: AmoCrmConfig
  private baseUrl: string
  private timeout: number
  private retryAttempts: number
  private retryDelay: number

  // Callback для обновления токенов
  public onTokenRefresh?: (tokens: { accessToken: string; refreshToken: string; expiresAt: number }) => Promise<void>

  constructor(config: AmoCrmConfig) {
    this.config = config
    this.baseUrl = `https://${config.subdomain}.amocrm.ru`
    this.timeout = 30000
    this.retryAttempts = 3
    this.retryDelay = 1000
  }

  /**
   * Генерирует URL для OAuth авторизации
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      mode: 'post_message',
      state: state || 'state',
    })
    return `${this.baseUrl}/oauth?${params.toString()}`
  }

  /**
   * Обменивает код авторизации на токены
   */
  async exchangeCodeForTokens(code: string): Promise<AmoCrmApiResponse<AmoCrmTokenResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth2/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [amoCRM] Ошибка обмена кода:', errorText)
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()

      // Сохраняем токены в конфиг
      this.config.accessToken = data.access_token
      this.config.refreshToken = data.refresh_token
      this.config.expiresAt = Date.now() + (data.expires_in * 1000)

      // Уведомляем о новых токенах
      if (this.onTokenRefresh) {
        await this.onTokenRefresh({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: this.config.expiresAt,
        })
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('❌ [amoCRM] Ошибка обмена кода:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      }
    }
  }

  /**
   * Обновляет access токен используя refresh токен
   */
  async refreshAccessToken(): Promise<AmoCrmApiResponse<AmoCrmTokenResponse>> {
    try {
      if (!this.config.refreshToken) {
        return {
          success: false,
          error: 'Refresh токен отсутствует',
        }
      }

      console.log('🔄 [amoCRM] Обновление access токена...')

      const response = await fetch(`${this.baseUrl}/oauth2/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken,
          redirect_uri: this.config.redirectUri,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [amoCRM] Ошибка обновления токена:', errorText)
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()

      // Обновляем токены в конфиге
      this.config.accessToken = data.access_token
      this.config.refreshToken = data.refresh_token
      this.config.expiresAt = Date.now() + (data.expires_in * 1000)

      console.log('✅ [amoCRM] Access токен успешно обновлен')

      // Уведомляем о новых токенах
      if (this.onTokenRefresh) {
        await this.onTokenRefresh({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: this.config.expiresAt,
        })
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('❌ [amoCRM] Ошибка обновления токена:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      }
    }
  }

  /**
   * Проверяет и при необходимости обновляет токен
   */
  private async ensureValidToken(): Promise<boolean> {
    if (!this.config.accessToken) {
      console.error('❌ [amoCRM] Access токен отсутствует')
      return false
    }

    // Проверяем, не истёк ли токен (с запасом 5 минут)
    if (this.config.expiresAt && this.config.expiresAt < Date.now() + 5 * 60 * 1000) {
      const result = await this.refreshAccessToken()
      return result.success
    }

    return true
  }

  /**
   * Выполняет API запрос
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<AmoCrmApiResponse<T>> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        // Проверяем валидность токена
        const tokenValid = await this.ensureValidToken()
        if (!tokenValid) {
          return {
            success: false,
            error: 'Не удалось получить валидный access токен',
          }
        }

        const url = `${this.baseUrl}${endpoint}`
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
          ...options.headers,
        }

        console.log(`🚀 [amoCRM API] Запрос ${attempt + 1}/${this.retryAttempts + 1}:`)
        console.log(`   📍 URL: ${url}`)
        console.log(`   📋 Method: ${options.method || 'GET'}`)

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

        console.log(`📥 [amoCRM API] Ответ получен за ${duration}ms:`)
        console.log(`   📊 Status: ${response.status} ${response.statusText}`)

        // Обработка 401 - требуется повторная авторизация
        if (response.status === 401) {
          console.log('⚠️ [amoCRM API] 401 Unauthorized - пробуем обновить токен')
          const refreshResult = await this.refreshAccessToken()
          if (refreshResult.success) {
            continue // Повторяем запрос с новым токеном
          }
          return {
            success: false,
            error: 'Требуется повторная авторизация в amoCRM',
          }
        }

        // Обработка 429 - слишком много запросов
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.retryDelay * (attempt + 1)
          console.log(`⏳ [amoCRM API] Rate limit, ожидаем ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.log(`   ❌ Error Body:`, errorText)

          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              error: `HTTP ${response.status}: ${response.statusText}. ${errorText}`,
            }
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        // Для 204 No Content возвращаем успех без данных
        if (response.status === 204) {
          return {
            success: true,
          }
        }

        const responseText = await response.text()
        let data: any

        try {
          data = JSON.parse(responseText)
        } catch {
          data = responseText
        }

        // amoCRM возвращает данные в _embedded
        let extractedData = data
        if (data && typeof data === 'object' && '_embedded' in data) {
          // Определяем тип сущности
          const entityTypes = ['contacts', 'leads', 'companies', 'notes', 'tasks', 'pipelines', 'users']
          for (const type of entityTypes) {
            if (data._embedded[type]) {
              extractedData = data._embedded[type]
              break
            }
          }
        }

        return {
          success: true,
          data: extractedData,
          pagination: data._page ? {
            _page: data._page,
            _links: data._links,
          } : undefined,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.log(`   ❌ [amoCRM API] Ошибка попытки ${attempt + 1}:`, lastError.message)

        if (attempt === this.retryAttempts) {
          break
        }

        const delay = this.retryDelay * (attempt + 1)
        console.log(`   ⏳ Ожидание ${delay}ms перед следующей попыткой...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Неизвестная ошибка',
    }
  }

  // ==================== КОНТАКТЫ ====================

  /**
   * Получить список контактов
   */
  async getContacts(params?: {
    page?: number
    limit?: number
    query?: string
    filter?: Record<string, any>
    with?: string[]
  }): Promise<AmoCrmApiResponse<AmoCrmContact[]>> {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.query) searchParams.set('query', params.query)
    if (params?.with?.length) searchParams.set('with', params.with.join(','))
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        searchParams.set(`filter[${key}]`, String(value))
      })
    }

    const query = searchParams.toString()
    return this.makeRequest<AmoCrmContact[]>(`/api/v4/contacts${query ? `?${query}` : ''}`)
  }

  /**
   * Получить контакт по ID
   */
  async getContact(id: number, withRelations?: string[]): Promise<AmoCrmApiResponse<AmoCrmContact>> {
    const query = withRelations?.length ? `?with=${withRelations.join(',')}` : ''
    return this.makeRequest<AmoCrmContact>(`/api/v4/contacts/${id}${query}`)
  }

  /**
   * Создать контакты
   */
  async createContacts(contacts: Omit<AmoCrmContact, 'id'>[]): Promise<AmoCrmApiResponse<AmoCrmContact[]>> {
    return this.makeRequest<AmoCrmContact[]>('/api/v4/contacts', {
      method: 'POST',
      body: JSON.stringify(contacts),
    })
  }

  /**
   * Обновить контакты
   */
  async updateContacts(contacts: AmoCrmContact[]): Promise<AmoCrmApiResponse<AmoCrmContact[]>> {
    return this.makeRequest<AmoCrmContact[]>('/api/v4/contacts', {
      method: 'PATCH',
      body: JSON.stringify(contacts),
    })
  }

  /**
   * Поиск контакта по email или телефону
   */
  async findContactByEmailOrPhone(email?: string, phone?: string): Promise<AmoCrmApiResponse<AmoCrmContact[]>> {
    const query = email || phone || ''
    if (!query) {
      return { success: true, data: [] }
    }
    return this.getContacts({ query, limit: 10 })
  }

  /**
   * Batch создание контактов (с учетом лимита amoCRM = 250)
   */
  async createContactsBatch(contacts: Omit<AmoCrmContact, 'id'>[]): Promise<AmoCrmApiResponse<AmoCrmContact[]>> {
    const BATCH_SIZE = 250
    const allResults: AmoCrmContact[] = []
    const errors: string[] = []

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE)
      console.log(`📦 [amoCRM] Создание контактов batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contacts.length / BATCH_SIZE)} (${batch.length} записей)`)

      const result = await this.createContacts(batch)

      if (result.success && result.data) {
        allResults.push(...result.data)
      } else if (result.error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.error}`)
      }

      // Задержка между batch запросами для соблюдения rate limit
      if (i + BATCH_SIZE < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return {
      success: errors.length === 0,
      data: allResults,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    }
  }

  /**
   * Batch обновление контактов
   */
  async updateContactsBatch(contacts: AmoCrmContact[]): Promise<AmoCrmApiResponse<AmoCrmContact[]>> {
    const BATCH_SIZE = 250
    const allResults: AmoCrmContact[] = []
    const errors: string[] = []

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE)
      console.log(`📦 [amoCRM] Обновление контактов batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contacts.length / BATCH_SIZE)} (${batch.length} записей)`)

      const result = await this.updateContacts(batch)

      if (result.success && result.data) {
        allResults.push(...result.data)
      } else if (result.error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.error}`)
      }

      if (i + BATCH_SIZE < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return {
      success: errors.length === 0,
      data: allResults,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    }
  }

  // ==================== СДЕЛКИ ====================

  /**
   * Получить список сделок
   */
  async getLeads(params?: {
    page?: number
    limit?: number
    query?: string
    filter?: Record<string, any>
    with?: string[]
  }): Promise<AmoCrmApiResponse<AmoCrmLead[]>> {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.query) searchParams.set('query', params.query)
    if (params?.with?.length) searchParams.set('with', params.with.join(','))
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        searchParams.set(`filter[${key}]`, String(value))
      })
    }

    const query = searchParams.toString()
    return this.makeRequest<AmoCrmLead[]>(`/api/v4/leads${query ? `?${query}` : ''}`)
  }

  /**
   * Получить сделку по ID
   */
  async getLead(id: number, withRelations?: string[]): Promise<AmoCrmApiResponse<AmoCrmLead>> {
    const query = withRelations?.length ? `?with=${withRelations.join(',')}` : ''
    return this.makeRequest<AmoCrmLead>(`/api/v4/leads/${id}${query}`)
  }

  /**
   * Создать сделки
   */
  async createLeads(leads: Omit<AmoCrmLead, 'id'>[]): Promise<AmoCrmApiResponse<AmoCrmLead[]>> {
    return this.makeRequest<AmoCrmLead[]>('/api/v4/leads', {
      method: 'POST',
      body: JSON.stringify(leads),
    })
  }

  /**
   * Обновить сделки
   */
  async updateLeads(leads: AmoCrmLead[]): Promise<AmoCrmApiResponse<AmoCrmLead[]>> {
    return this.makeRequest<AmoCrmLead[]>('/api/v4/leads', {
      method: 'PATCH',
      body: JSON.stringify(leads),
    })
  }

  /**
   * Batch создание сделок (с учетом лимита amoCRM = 250)
   */
  async createLeadsBatch(leads: Omit<AmoCrmLead, 'id'>[]): Promise<AmoCrmApiResponse<AmoCrmLead[]>> {
    const BATCH_SIZE = 250
    const allResults: AmoCrmLead[] = []
    const errors: string[] = []

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE)
      console.log(`📦 [amoCRM] Создание сделок batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(leads.length / BATCH_SIZE)} (${batch.length} записей)`)

      const result = await this.createLeads(batch)

      if (result.success && result.data) {
        allResults.push(...result.data)
      } else if (result.error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.error}`)
      }

      if (i + BATCH_SIZE < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return {
      success: errors.length === 0,
      data: allResults,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    }
  }

  /**
   * Batch обновление сделок
   */
  async updateLeadsBatch(leads: AmoCrmLead[]): Promise<AmoCrmApiResponse<AmoCrmLead[]>> {
    const BATCH_SIZE = 250
    const allResults: AmoCrmLead[] = []
    const errors: string[] = []

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE)
      console.log(`📦 [amoCRM] Обновление сделок batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(leads.length / BATCH_SIZE)} (${batch.length} записей)`)

      const result = await this.updateLeads(batch)

      if (result.success && result.data) {
        allResults.push(...result.data)
      } else if (result.error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.error}`)
      }

      if (i + BATCH_SIZE < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return {
      success: errors.length === 0,
      data: allResults,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    }
  }

  /**
   * Создать сделку со связанным контактом
   */
  async createLeadWithContact(
    lead: Omit<AmoCrmLead, 'id'>,
    contactId: number
  ): Promise<AmoCrmApiResponse<AmoCrmLead[]>> {
    const leadWithContact = {
      ...lead,
      _embedded: {
        contacts: [{ id: contactId }],
      },
    }
    return this.createLeads([leadWithContact])
  }

  // ==================== КОМПАНИИ ====================

  /**
   * Получить список компаний
   */
  async getCompanies(params?: {
    page?: number
    limit?: number
    query?: string
    filter?: Record<string, any>
  }): Promise<AmoCrmApiResponse<AmoCrmCompany[]>> {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.query) searchParams.set('query', params.query)
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        searchParams.set(`filter[${key}]`, String(value))
      })
    }

    const query = searchParams.toString()
    return this.makeRequest<AmoCrmCompany[]>(`/api/v4/companies${query ? `?${query}` : ''}`)
  }

  /**
   * Создать компании
   */
  async createCompanies(companies: Omit<AmoCrmCompany, 'id'>[]): Promise<AmoCrmApiResponse<AmoCrmCompany[]>> {
    return this.makeRequest<AmoCrmCompany[]>('/api/v4/companies', {
      method: 'POST',
      body: JSON.stringify(companies),
    })
  }

  /**
   * Обновить компании
   */
  async updateCompanies(companies: AmoCrmCompany[]): Promise<AmoCrmApiResponse<AmoCrmCompany[]>> {
    return this.makeRequest<AmoCrmCompany[]>('/api/v4/companies', {
      method: 'PATCH',
      body: JSON.stringify(companies),
    })
  }

  // ==================== ПРИМЕЧАНИЯ ====================

  /**
   * Добавить примечание к сущности
   */
  async addNote(
    entityType: 'leads' | 'contacts' | 'companies',
    entityId: number,
    note: Omit<AmoCrmNote, 'id' | 'entity_id'>
  ): Promise<AmoCrmApiResponse<AmoCrmNote[]>> {
    const noteData = {
      ...note,
      entity_id: entityId,
    }
    return this.makeRequest<AmoCrmNote[]>(`/api/v4/${entityType}/${entityId}/notes`, {
      method: 'POST',
      body: JSON.stringify([noteData]),
    })
  }

  /**
   * Получить примечания сущности
   */
  async getNotes(
    entityType: 'leads' | 'contacts' | 'companies',
    entityId: number,
    params?: { page?: number; limit?: number }
  ): Promise<AmoCrmApiResponse<AmoCrmNote[]>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const query = searchParams.toString()
    return this.makeRequest<AmoCrmNote[]>(
      `/api/v4/${entityType}/${entityId}/notes${query ? `?${query}` : ''}`
    )
  }

  // ==================== ЗАДАЧИ ====================

  /**
   * Получить список задач
   */
  async getTasks(params?: {
    page?: number
    limit?: number
    filter?: Record<string, any>
  }): Promise<AmoCrmApiResponse<AmoCrmTask[]>> {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        searchParams.set(`filter[${key}]`, String(value))
      })
    }

    const query = searchParams.toString()
    return this.makeRequest<AmoCrmTask[]>(`/api/v4/tasks${query ? `?${query}` : ''}`)
  }

  /**
   * Создать задачи
   */
  async createTasks(tasks: Omit<AmoCrmTask, 'id'>[]): Promise<AmoCrmApiResponse<AmoCrmTask[]>> {
    return this.makeRequest<AmoCrmTask[]>('/api/v4/tasks', {
      method: 'POST',
      body: JSON.stringify(tasks),
    })
  }

  /**
   * Обновить задачи
   */
  async updateTasks(tasks: AmoCrmTask[]): Promise<AmoCrmApiResponse<AmoCrmTask[]>> {
    return this.makeRequest<AmoCrmTask[]>('/api/v4/tasks', {
      method: 'PATCH',
      body: JSON.stringify(tasks),
    })
  }

  // ==================== ВОРОНКИ И СТАТУСЫ ====================

  /**
   * Получить воронки продаж
   */
  async getPipelines(): Promise<AmoCrmApiResponse<AmoCrmPipeline[]>> {
    return this.makeRequest<AmoCrmPipeline[]>('/api/v4/leads/pipelines')
  }

  /**
   * Получить статусы воронки
   */
  async getPipelineStatuses(pipelineId: number): Promise<AmoCrmApiResponse<AmoCrmStatus[]>> {
    return this.makeRequest<AmoCrmStatus[]>(`/api/v4/leads/pipelines/${pipelineId}/statuses`)
  }

  // ==================== ПОЛЬЗОВАТЕЛИ ====================

  /**
   * Получить список пользователей
   */
  async getUsers(): Promise<AmoCrmApiResponse<AmoCrmUser[]>> {
    return this.makeRequest<AmoCrmUser[]>('/api/v4/users')
  }

  /**
   * Получить информацию о текущем аккаунте
   */
  async getAccount(): Promise<AmoCrmApiResponse<any>> {
    return this.makeRequest<any>('/api/v4/account')
  }

  // ==================== КАСТОМНЫЕ ПОЛЯ ====================

  /**
   * Получить кастомные поля сущности
   */
  async getCustomFields(entityType: 'leads' | 'contacts' | 'companies'): Promise<AmoCrmApiResponse<any[]>> {
    return this.makeRequest<any[]>(`/api/v4/${entityType}/custom_fields`)
  }

  // ==================== ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ ====================

  /**
   * Проверить подключение к amoCRM
   */
  async testConnection(): Promise<AmoCrmApiResponse<any>> {
    try {
      if (!this.config.accessToken) {
        return {
          success: false,
          error: 'Access токен не настроен. Необходимо выполнить авторизацию.',
        }
      }

      const result = await this.getAccount()

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: 'Подключение к amoCRM успешно установлено',
        }
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка при тестировании подключения',
      }
    }
  }
}

// Глобальный экземпляр клиента
let amoCrmClient: AmoCrmApiClient | null = null

export function initAmoCrmClient(config: AmoCrmConfig): AmoCrmApiClient {
  amoCrmClient = new AmoCrmApiClient(config)
  return amoCrmClient
}

export function getAmoCrmClient(): AmoCrmApiClient | null {
  return amoCrmClient
}

export function useAmoCrmApi(): AmoCrmApiClient {
  const client = getAmoCrmClient()
  if (!client) {
    throw new Error('amoCRM API client not initialized. Call initAmoCrmClient first.')
  }
  return client
}
