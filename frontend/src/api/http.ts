/** Session Cookie + X-CSRF-Token; credentials never enter localStorage. */
export interface FieldError { field: string; message: string }
export class ApiError extends Error {
  constructor(public status: number, public code: string, public title: string, public detail: string, public errors: FieldError[] = []) {
    super(detail || title)
    this.name = 'ApiError'
  }
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
let csrfToken: string | null = null
let csrfRequest: Promise<string> | null = null
let csrfGeneration = 0
const listeners = new Set<(error: ApiError) => void>()
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const PUBLIC_WRITES = new Set(['/api/v1/auth/sessions', '/api/v1/auth/registrations'])
export function subscribeAuthInvalidation(listener: (error: ApiError) => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function setCsrfToken(token: string | null) {
  csrfGeneration++
  csrfToken = token
  csrfRequest = null
}
async function parseError(response: Response): Promise<ApiError> {
  let body: unknown
  try { body = await response.json() } catch { body = null }
  const data = isRecord(body) ? body : {}
  const errors = Array.isArray(data.errors) ? data.errors.filter((item): item is FieldError =>
    isRecord(item) && typeof item.field === 'string' && typeof item.message === 'string') : []
  return new ApiError(response.status, typeof data.code === 'string' ? data.code : 'UNKNOWN',
    typeof data.title === 'string' ? data.title : '请求失败',
    typeof data.detail === 'string' ? data.detail : `服务暂不可用（${response.status}）`, errors)
}
async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  if (csrfRequest) return csrfRequest
  const generation = csrfGeneration
  const request = http<unknown>('/api/v1/auth/csrf').then(data => {
    if (!isRecord(data) || typeof data.token !== 'string' || !data.token || data.headerName !== 'X-CSRF-Token') {
      throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '安全凭证响应异常，请刷新后重试')
    }
    if (generation === csrfGeneration) csrfToken = data.token
    return data.token
  }).finally(() => { if (generation === csrfGeneration) csrfRequest = null })
  csrfRequest = request
  return request
}
async function request(path: string, options: RequestInit = {}): Promise<Response> {
  if (!path.startsWith('/api/v1/')) throw new Error('API 请求必须使用站内 /api/v1/ 路径')
  const headers = new Headers(options.headers)
  const method = (options.method ?? 'GET').toUpperCase()
  if (!SAFE_METHODS.has(method) && !PUBLIC_WRITES.has(path) && !path.startsWith('/api/v1/ta/')) headers.set('X-CSRF-Token', await getCsrfToken())
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const requestGeneration = csrfGeneration
  let response: Response
  try { response = await fetch(path, { ...options, method, headers, credentials: 'same-origin' }) }
  catch { throw new ApiError(0, 'NETWORK_ERROR', '网络连接失败', '无法连接服务，请检查网络后重试') }
  if (!response.ok) {
    const error = await parseError(response)
    if (error.code === 'AUTH_CSRF_INVALID' && requestGeneration === csrfGeneration) setCsrfToken(null)
    if (requestGeneration === csrfGeneration && ((error.status === 401 && !PUBLIC_WRITES.has(path)) || error.code === 'AUTH_ACCOUNT_DISABLED')) {
      setCsrfToken(null)
      listeners.forEach(listener => listener(error))
    }
    throw error
  }
  return response
}
export async function httpBlob(path: string): Promise<{ blob: Blob; contentType: string; disposition: string }> {
  const response = await request(path)
  return { blob: await response.blob(), contentType: response.headers.get('Content-Type') ?? '', disposition: response.headers.get('Content-Disposition') ?? '' }
}
export async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await request(path, options)
  if (response.status === 204) return undefined as T
  let payload: unknown
  try { payload = await response.json() } catch { throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '服务返回了无法识别的响应') }
  if (!isRecord(payload) || payload.code !== 0 || !('data' in payload)) throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '服务返回了无法识别的响应')
  return payload.data as T
}
