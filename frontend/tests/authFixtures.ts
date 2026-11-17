import { vi } from 'vitest'
import { setCsrfToken } from '../src/api/http'
import type { Role } from '../src/api/endpoints/auth'
export function sessionUser(role: Role = 'INVESTOR') {
  return { id: 42, username: 'layout-user', displayName: '布局测试用户', role, status: 'NORMAL', isSecurityVerified: false,
    riskLevel: null, riskLevelLabel: null, riskProfileType: null, accountType: null, createdAt: '2026-11-16T00:00:00Z' }
}
export function mockSessionApi(role?: Role) {
  setCsrfToken(null)
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const resolvedRole = role ?? (window.location.pathname.startsWith('/investor') ? 'INVESTOR' : 'ADVISOR')
    const data = String(input).endsWith('/csrf') ? { token: 'test-csrf', headerName: 'X-CSRF-Token' } : sessionUser(resolvedRole)
    return new Response(JSON.stringify({ code: 0, message: 'ok', data, timestamp: '2026-11-16T00:00:00Z' }), { status: 200 })
  }))
}
