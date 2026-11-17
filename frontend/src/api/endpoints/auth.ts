import { ApiError, http, isRecord, setCsrfToken } from '../http'
export type Role = 'INVESTOR' | 'ADVISOR'
export interface UserProfile {
  id: number; username: string; displayName: string; role: Role; status: 'NORMAL' | 'DISABLED'
  isSecurityVerified: boolean; riskLevel: string | null; riskLevelLabel: string | null
  riskProfileType: string | null; accountType: string | null; createdAt: string
}
export interface LoginInput { username: string; password: string }
export interface RegistrationInput extends LoginInput { displayName: string; role: Role }
export interface RegistrationResult { userId: number; username: string; displayName: string; role: Role; customerCode: string | null; initialCash: string | null }
function invalidResponse(): never { throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '账户响应异常，请稍后重试') }
function isRole(role: unknown): role is Role { return role === 'INVESTOR' || role === 'ADVISOR' }
function nullableString(value: unknown): string | null {
  if (value === null || typeof value === 'string') return value
  return invalidResponse()
}
function parseUser(value: unknown): UserProfile {
  if (!isRecord(value) || typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id <= 0 ||
    typeof value.username !== 'string' || typeof value.displayName !== 'string' || !isRole(value.role) ||
    (value.status !== 'NORMAL' && value.status !== 'DISABLED') || typeof value.isSecurityVerified !== 'boolean' ||
    typeof value.createdAt !== 'string' ||
    !['riskLevel', 'riskLevelLabel', 'riskProfileType', 'accountType'].every(key => value[key] === null || typeof value[key] === 'string')) invalidResponse()
  return { id: value.id, username: value.username, displayName: value.displayName, role: value.role, status: value.status,
    isSecurityVerified: value.isSecurityVerified, createdAt: value.createdAt, riskLevel: nullableString(value.riskLevel),
    riskLevelLabel: nullableString(value.riskLevelLabel), riskProfileType: nullableString(value.riskProfileType), accountType: nullableString(value.accountType) }
}
export async function getCurrentUser() { return parseUser(await http<unknown>('/api/v1/auth/me')) }
export async function createSession(input: LoginInput) {
  const data = await http<unknown>('/api/v1/auth/sessions', { method: 'POST', body: JSON.stringify(input) })
  if (!isRecord(data) || typeof data.csrfToken !== 'string' || !data.csrfToken || data.csrfHeaderName !== 'X-CSRF-Token') invalidResponse()
  const user = parseUser(data.user)
  setCsrfToken(data.csrfToken)
  return user
}
export async function deleteSession() {
  await http<void>('/api/v1/auth/sessions/current', { method: 'DELETE' })
  setCsrfToken(null)
}
export async function createRegistration(input: RegistrationInput): Promise<RegistrationResult> {
  const data = await http<unknown>('/api/v1/auth/registrations', { method: 'POST', body: JSON.stringify(input) })
  if (!isRecord(data) || typeof data.userId !== 'number' || typeof data.username !== 'string' || typeof data.displayName !== 'string' ||
    !isRole(data.role) || !(data.customerCode === null || typeof data.customerCode === 'string') ||
    !(data.initialCash === null || typeof data.initialCash === 'string')) invalidResponse()
  return { userId: data.userId, username: data.username, displayName: data.displayName, role: data.role, customerCode: data.customerCode, initialCash: data.initialCash }
}
