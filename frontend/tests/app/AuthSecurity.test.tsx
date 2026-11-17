import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InvestorApp from '../../src/app/apps/InvestorApp'
import { safeReturnTo } from '../../src/app/authRouting'
import { http, setCsrfToken } from '../../src/api/http'
import { sessionUser } from '../authFixtures'
const ok = (data: unknown) => new Response(JSON.stringify({ code: 0, data }), { status: 200 })
const anonymous = () => new Response(JSON.stringify({ code: 'AUTH_SESSION_EXPIRED', detail: '登录已过期，请重新登录' }), { status: 401 })
beforeEach(() => setCsrfToken(null))
afterEach(() => vi.unstubAllGlobals())
describe('session and navigation security', () => {
  it.each(['https://evil.example/', '//evil.example/', '/advisor/overview', '/investor/../../login', '/investor/\\evil', '/investor/%2e%2e/advisor'])('rejects an unsafe return destination: %s', path => {
    expect(safeReturnTo(path, 'investor')).toBe('/investor/overview')
  })
  it('keeps a valid same-site query and hash', () => {
    expect(safeReturnTo('/investor/funds?view=favorites#top', 'investor')).toBe('/investor/funds?view=favorites#top')
  })
  it('gets a session-bound CSRF token and handles an empty logout response', async () => {
    const api = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/csrf') ? ok({ token: 'csrf-42', headerName: 'X-CSRF-Token' }) : new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', api)
    await expect(http<void>('/api/v1/auth/sessions/current', { method: 'DELETE' })).resolves.toBeUndefined()
    expect(api.mock.calls).toHaveLength(2)
    const options = vi.mocked(fetch).mock.calls[1][1]
    expect(new Headers(options?.headers).get('X-CSRF-Token')).toBe('csrf-42')
    expect(options?.credentials).toBe('same-origin')
  })
  it('returns to login after successful server logout', async () => {
    let loggedIn = true
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.endsWith('/csrf')) return ok({ token: 'csrf-42', headerName: 'X-CSRF-Token' })
      if (path.endsWith('/sessions/current')) { loggedIn = false; return new Response(null, { status: 204 }) }
      return loggedIn ? ok(sessionUser()) : anonymous()
    }))
    window.history.replaceState({}, '', '/investor/overview')
    render(<InvestorApp />)
    fireEvent.click(await screen.findByRole('button', { name: '打开账户' }))
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }))
    expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '我的财富' })).not.toBeInTheDocument()
  })
  it('blocks the wrong role when another site replaces the shared cookie', async () => {
    let role: 'INVESTOR' | 'ADVISOR' = 'INVESTOR'
    vi.stubGlobal('fetch', vi.fn(async () => ok(sessionUser(role))))
    window.history.replaceState({}, '', '/investor/overview')
    render(<InvestorApp />)
    await screen.findByRole('heading', { name: '资产总览' })
    role = 'ADVISOR'
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(await screen.findByRole('heading', { name: '当前账号无法访问用户端' })).toBeInTheDocument()
  })
  it('shows a retryable session error instead of granting access on a network failure', async () => {
    const api = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', api)
    window.history.replaceState({}, '', '/investor/overview')
    render(<InvestorApp />)
    expect(await screen.findByRole('heading', { name: '暂时无法恢复会话' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '我的财富' })).not.toBeInTheDocument()
    api.mockResolvedValue(ok(sessionUser()))
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: '资产总览' })).toBeInTheDocument())
  })
})
