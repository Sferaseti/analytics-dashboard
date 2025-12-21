/**
 * Yandex Cloud API Client
 * Клиент для работы с сервисами Yandex Cloud
 *
 * Поддерживаемые сервисы:
 * - Object Storage (S3-совместимый)
 * - IAM (Identity and Access Management)
 * - Serverless Functions
 */

export interface YandexCloudConfig {
  // Основные параметры
  folderId: string
  // Для сервисного аккаунта
  serviceAccountId?: string
  serviceAccountKeyId?: string
  serviceAccountPrivateKey?: string
  // Для OAuth токена
  oauthToken?: string
  // Для статических ключей (Object Storage)
  accessKeyId?: string
  secretAccessKey?: string
  // Настройки
  region?: string
  timeout?: number
}

export interface YandexCloudStorageConfig {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region?: string
  endpoint?: string
}

export interface YandexCloudApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface YandexCloudFile {
  key: string
  size: number
  lastModified: string
  etag: string
  storageClass?: string
}

export interface YandexCloudUploadResult {
  key: string
  bucket: string
  etag: string
  location: string
}

export interface YandexCloudIAMToken {
  iamToken: string
  expiresAt: string
}

/**
 * Yandex Cloud Object Storage Client
 * Работает с S3-совместимым API
 */
export class YandexCloudStorageClient {
  private config: YandexCloudStorageConfig
  private endpoint: string

  constructor(config: YandexCloudStorageConfig) {
    this.config = config
    this.endpoint = config.endpoint || 'https://storage.yandexcloud.net'
  }

  /**
   * Генерация подписи для S3-совместимого API (AWS Signature V4)
   */
  private async generateSignature(
    method: string,
    path: string,
    headers: Record<string, string>,
    payload: string = ''
  ): Promise<{ authorization: string; signedHeaders: Record<string, string> }> {
    const region = this.config.region || 'ru-central1'
    const service = 's3'
    const now = new Date()
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')

    // Создаем SHA-256 хеш payload
    const payloadHash = await this.sha256(payload)

    // Каноническеский запрос
    const signedHeadersList = ['host', 'x-amz-content-sha256', 'x-amz-date']
    const canonicalHeaders = [
      `host:${new URL(this.endpoint).host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
    ].join('\n') + '\n'

    const canonicalRequest = [
      method,
      path,
      '', // query string
      canonicalHeaders,
      signedHeadersList.join(';'),
      payloadHash,
    ].join('\n')

    // Строка для подписи
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      await this.sha256(canonicalRequest),
    ].join('\n')

    // Вычисляем подпись
    const kDate = await this.hmacSHA256('AWS4' + this.config.secretAccessKey, dateStamp)
    const kRegion = await this.hmacSHA256(kDate, region)
    const kService = await this.hmacSHA256(kRegion, service)
    const kSigning = await this.hmacSHA256(kService, 'aws4_request')
    const signature = await this.hmacSHA256Hex(kSigning, stringToSign)

    const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersList.join(';')}, Signature=${signature}`

    return {
      authorization,
      signedHeaders: {
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
      },
    }
  }

  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  private async hmacSHA256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    const keyData = typeof key === 'string' ? encoder.encode(key) : key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  }

  private async hmacSHA256Hex(key: ArrayBuffer, message: string): Promise<string> {
    const signature = await this.hmacSHA256(key, message)
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Загрузка файла в Object Storage
   */
  async uploadFile(
    key: string,
    data: Buffer | string,
    contentType: string = 'application/octet-stream'
  ): Promise<YandexCloudApiResponse<YandexCloudUploadResult>> {
    try {
      const path = `/${this.config.bucket}/${key}`
      const payload = typeof data === 'string' ? data : data.toString('base64')

      const { authorization, signedHeaders } = await this.generateSignature(
        'PUT',
        path,
        {},
        payload
      )

      const response = await fetch(`${this.endpoint}${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': authorization,
          'Content-Type': contentType,
          ...signedHeaders,
        },
        body: data,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Upload failed: ${response.status} - ${errorText}`,
        }
      }

      const etag = response.headers.get('ETag') || ''

      return {
        success: true,
        data: {
          key,
          bucket: this.config.bucket,
          etag,
          location: `${this.endpoint}${path}`,
        },
      }
    } catch (error) {
      console.error('[Yandex Cloud Storage] Upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      }
    }
  }

  /**
   * Скачивание файла из Object Storage
   */
  async downloadFile(key: string): Promise<YandexCloudApiResponse<Buffer>> {
    try {
      const path = `/${this.config.bucket}/${key}`

      const { authorization, signedHeaders } = await this.generateSignature(
        'GET',
        path,
        {}
      )

      const response = await fetch(`${this.endpoint}${path}`, {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          ...signedHeaders,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Download failed: ${response.status} - ${errorText}`,
        }
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      return {
        success: true,
        data: buffer,
      }
    } catch (error) {
      console.error('[Yandex Cloud Storage] Download error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown download error',
      }
    }
  }

  /**
   * Удаление файла из Object Storage
   */
  async deleteFile(key: string): Promise<YandexCloudApiResponse<void>> {
    try {
      const path = `/${this.config.bucket}/${key}`

      const { authorization, signedHeaders } = await this.generateSignature(
        'DELETE',
        path,
        {}
      )

      const response = await fetch(`${this.endpoint}${path}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authorization,
          ...signedHeaders,
        },
      })

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Delete failed: ${response.status} - ${errorText}`,
        }
      }

      return {
        success: true,
        message: `File ${key} deleted successfully`,
      }
    } catch (error) {
      console.error('[Yandex Cloud Storage] Delete error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delete error',
      }
    }
  }

  /**
   * Получение списка файлов в бакете
   */
  async listFiles(prefix?: string, maxKeys: number = 1000): Promise<YandexCloudApiResponse<YandexCloudFile[]>> {
    try {
      let path = `/${this.config.bucket}?list-type=2&max-keys=${maxKeys}`
      if (prefix) {
        path += `&prefix=${encodeURIComponent(prefix)}`
      }

      const { authorization, signedHeaders } = await this.generateSignature(
        'GET',
        path,
        {}
      )

      const response = await fetch(`${this.endpoint}${path}`, {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          ...signedHeaders,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `List failed: ${response.status} - ${errorText}`,
        }
      }

      const xmlText = await response.text()
      const files = this.parseListResponse(xmlText)

      return {
        success: true,
        data: files,
      }
    } catch (error) {
      console.error('[Yandex Cloud Storage] List error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown list error',
      }
    }
  }

  private parseListResponse(xml: string): YandexCloudFile[] {
    const files: YandexCloudFile[] = []
    const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g
    let match

    while ((match = contentRegex.exec(xml)) !== null) {
      const content = match[1]
      const key = this.extractXmlValue(content, 'Key')
      const size = parseInt(this.extractXmlValue(content, 'Size') || '0', 10)
      const lastModified = this.extractXmlValue(content, 'LastModified')
      const etag = this.extractXmlValue(content, 'ETag')
      const storageClass = this.extractXmlValue(content, 'StorageClass')

      if (key) {
        files.push({
          key,
          size,
          lastModified: lastModified || '',
          etag: etag || '',
          storageClass,
        })
      }
    }

    return files
  }

  private extractXmlValue(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`)
    const match = regex.exec(xml)
    return match ? match[1] : undefined
  }

  /**
   * Генерация presigned URL для временного доступа к файлу
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<YandexCloudApiResponse<string>> {
    try {
      const region = this.config.region || 'ru-central1'
      const now = new Date()
      const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')

      const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
      const credential = `${this.config.accessKeyId}/${credentialScope}`

      const queryParams = new URLSearchParams({
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': credential,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': expiresIn.toString(),
        'X-Amz-SignedHeaders': 'host',
      })

      const path = `/${this.config.bucket}/${key}`
      const host = new URL(this.endpoint).host

      const canonicalRequest = [
        'GET',
        path,
        queryParams.toString(),
        `host:${host}\n`,
        'host',
        'UNSIGNED-PAYLOAD',
      ].join('\n')

      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        await this.sha256(canonicalRequest),
      ].join('\n')

      const kDate = await this.hmacSHA256('AWS4' + this.config.secretAccessKey, dateStamp)
      const kRegion = await this.hmacSHA256(kDate, region)
      const kService = await this.hmacSHA256(kRegion, 's3')
      const kSigning = await this.hmacSHA256(kService, 'aws4_request')
      const signature = await this.hmacSHA256Hex(kSigning, stringToSign)

      queryParams.set('X-Amz-Signature', signature)

      const presignedUrl = `${this.endpoint}${path}?${queryParams.toString()}`

      return {
        success: true,
        data: presignedUrl,
      }
    } catch (error) {
      console.error('[Yandex Cloud Storage] Presigned URL error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown presigned URL error',
      }
    }
  }
}

/**
 * Yandex Cloud IAM Client
 * Для работы с токенами и авторизацией
 */
export class YandexCloudIAMClient {
  private config: YandexCloudConfig
  private iamEndpoint = 'https://iam.api.cloud.yandex.net'
  private cachedToken: YandexCloudIAMToken | null = null

  constructor(config: YandexCloudConfig) {
    this.config = config
  }

  /**
   * Получение IAM токена через OAuth
   */
  async getIAMTokenFromOAuth(): Promise<YandexCloudApiResponse<YandexCloudIAMToken>> {
    if (!this.config.oauthToken) {
      return {
        success: false,
        error: 'OAuth token not configured',
      }
    }

    try {
      const response = await fetch(`${this.iamEndpoint}/iam/v1/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          yandexPassportOauthToken: this.config.oauthToken,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `IAM token request failed: ${response.status} - ${errorText}`,
        }
      }

      const data = await response.json()
      this.cachedToken = {
        iamToken: data.iamToken,
        expiresAt: data.expiresAt,
      }

      return {
        success: true,
        data: this.cachedToken,
      }
    } catch (error) {
      console.error('[Yandex Cloud IAM] Token error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown IAM error',
      }
    }
  }

  /**
   * Получение IAM токена через сервисный аккаунт (JWT)
   */
  async getIAMTokenFromServiceAccount(): Promise<YandexCloudApiResponse<YandexCloudIAMToken>> {
    if (!this.config.serviceAccountId || !this.config.serviceAccountKeyId || !this.config.serviceAccountPrivateKey) {
      return {
        success: false,
        error: 'Service account credentials not configured',
      }
    }

    try {
      // Создание JWT токена для сервисного аккаунта
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        aud: 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
        iss: this.config.serviceAccountId,
        iat: now,
        exp: now + 3600,
      }

      // Импортируем jose для создания JWT
      const { SignJWT, importPKCS8 } = await import('jose')

      const privateKey = await importPKCS8(this.config.serviceAccountPrivateKey, 'PS256')

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({
          alg: 'PS256',
          kid: this.config.serviceAccountKeyId
        })
        .sign(privateKey)

      const response = await fetch(`${this.iamEndpoint}/iam/v1/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jwt,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `IAM token request failed: ${response.status} - ${errorText}`,
        }
      }

      const data = await response.json()
      this.cachedToken = {
        iamToken: data.iamToken,
        expiresAt: data.expiresAt,
      }

      return {
        success: true,
        data: this.cachedToken,
      }
    } catch (error) {
      console.error('[Yandex Cloud IAM] Service account token error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown IAM error',
      }
    }
  }

  /**
   * Получение текущего IAM токена (с автообновлением)
   */
  async getToken(): Promise<YandexCloudApiResponse<string>> {
    // Проверяем кэшированный токен
    if (this.cachedToken) {
      const expiresAt = new Date(this.cachedToken.expiresAt)
      const now = new Date()
      // Обновляем токен за 5 минут до истечения
      if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
        return {
          success: true,
          data: this.cachedToken.iamToken,
        }
      }
    }

    // Получаем новый токен
    let result: YandexCloudApiResponse<YandexCloudIAMToken>

    if (this.config.oauthToken) {
      result = await this.getIAMTokenFromOAuth()
    } else if (this.config.serviceAccountId) {
      result = await this.getIAMTokenFromServiceAccount()
    } else {
      return {
        success: false,
        error: 'No authentication method configured',
      }
    }

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to get IAM token',
      }
    }

    return {
      success: true,
      data: result.data.iamToken,
    }
  }
}

/**
 * Основной Yandex Cloud Client
 * Объединяет все сервисы
 */
export class YandexCloudClient {
  private config: YandexCloudConfig
  private iam: YandexCloudIAMClient
  private storage: YandexCloudStorageClient | null = null
  private apiEndpoint = 'https://api.cloud.yandex.net'

  constructor(config: YandexCloudConfig) {
    this.config = config
    this.iam = new YandexCloudIAMClient(config)
  }

  /**
   * Инициализация клиента Object Storage
   */
  initStorage(bucket: string): YandexCloudStorageClient {
    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error('Storage credentials (accessKeyId, secretAccessKey) are required')
    }

    this.storage = new YandexCloudStorageClient({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      bucket,
      region: this.config.region || 'ru-central1',
    })

    return this.storage
  }

  /**
   * Получение клиента Object Storage
   */
  getStorage(): YandexCloudStorageClient {
    if (!this.storage) {
      throw new Error('Storage client not initialized. Call initStorage first.')
    }
    return this.storage
  }

  /**
   * Получение IAM клиента
   */
  getIAM(): YandexCloudIAMClient {
    return this.iam
  }

  /**
   * Выполнение API запроса к Yandex Cloud
   */
  async apiRequest<T>(
    service: string,
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<YandexCloudApiResponse<T>> {
    const tokenResult = await this.iam.getToken()
    if (!tokenResult.success || !tokenResult.data) {
      return {
        success: false,
        error: tokenResult.error || 'Failed to get authorization token',
      }
    }

    try {
      const url = `${this.apiEndpoint}/${service}/${endpoint}`
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${tokenResult.data}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `API request failed: ${response.status} - ${errorText}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error(`[Yandex Cloud ${service}] API error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown API error',
      }
    }
  }

  /**
   * Получение информации о folder
   */
  async getFolderInfo(): Promise<YandexCloudApiResponse<Record<string, unknown>>> {
    return this.apiRequest(
      'resource-manager',
      'GET',
      `v1/folders/${this.config.folderId}`
    )
  }

  /**
   * Тестирование подключения
   */
  async testConnection(): Promise<YandexCloudApiResponse<{ storage: boolean; api: boolean }>> {
    const results = {
      storage: false,
      api: false,
    }

    // Тестирование API доступа
    if (this.config.oauthToken || this.config.serviceAccountId) {
      const tokenResult = await this.iam.getToken()
      results.api = tokenResult.success
    }

    // Тестирование Storage
    if (this.storage) {
      const listResult = await this.storage.listFiles('', 1)
      results.storage = listResult.success
    }

    const allSuccess = (results.api || !this.config.oauthToken && !this.config.serviceAccountId) &&
                       (results.storage || !this.storage)

    return {
      success: allSuccess,
      data: results,
      message: allSuccess ? 'Connection successful' : 'Some services failed to connect',
    }
  }
}

// Экспорт экземпляра клиента для использования в приложении
let yandexCloudClient: YandexCloudClient | null = null

export function initYandexCloudClient(config: YandexCloudConfig): YandexCloudClient {
  yandexCloudClient = new YandexCloudClient(config)
  return yandexCloudClient
}

export function getYandexCloudClient(): YandexCloudClient | null {
  return yandexCloudClient
}
