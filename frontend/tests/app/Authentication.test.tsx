import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InvestorApp from '../../src/app/apps/InvestorApp'
import { setCsrfToken } from '../../src/api/http'

const USER = { id: 42, username: 'chen', displayName: '陈女士', role: 'INVESTOR', status: 'NORMAL', isSecurityVerified: false, riskLevel: null, riskLevelLabel: null, riskProfileType: null, accountType: null, createdAt: '2026-11-16T00:00:00Z' }
function ok(data: unknown, status = 200) { return new Response(JSON.stringify({ code: 0, message: 'ok', data, timestamp: '2026-11-16T00:00:00Z' }), { status }) }
function problem(status: number, code: string, detail: string) { return new Response(JSON.stringify({ status, code, title: '请求失败', detail, errors: [] }), { status }) }
const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  setCsrfToken(null)
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => problem(401, 'AUTH_UNAUTHENTICATED', '请先登录'))
})
afterEach(() => { vi.unstubAllGlobals() })

describe('real authentication flow', () => {
  it('protects deep links and returns to the original page only after the server logs in', async () => {
    window.history.replaceState({}, '', '/investor/holdings?tab=all')
    let loggedIn = false
    fetchMock.mockImplementation(async (input, options) => {
      if (String(input).endsWith('/sessions') && options?.method === 'POST') {
        loggedIn = true
        return ok({ user: USER, csrfToken: 'session-token', csrfHeaderName: 'X-CSRF-Token' })
      }
      if (loggedIn) return ok(USER)
      return problem(401, 'AUTH_UNAUTHENTICATED', '请先登录')
    })
    render(<InvestorApp />)
    expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '我的持仓' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'chen' } })
    fireEvent.change(screen.getByLabelText('密码', { exact: true }), { target: { value: 'Password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByRole('heading', { name: '我的持仓' })).toBeInTheDocument()
    expect(window.location.search).toBe('?tab=all')
  })

  it('shows a server login error without opening protected pages', async () => {
    window.history.replaceState({}, '', '/login')
    fetchMock.mockImplementation(async input => String(input).endsWith('/sessions')
      ? problem(401, 'AUTH_INVALID_CREDENTIALS', '用户名或密码错误')
      : problem(401, 'AUTH_UNAUTHENTICATED', '请先登录'))
    render(<InvestorApp />)
    fireEvent.change(await screen.findByLabelText('用户名'), { target: { value: 'chen' } })
    fireEvent.change(screen.getByLabelText('密码', { exact: true }), { target: { value: 'Password123' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('用户名或密码错误')
    expect(window.location.pathname).toBe('/login')
  })

  it('registers the current site role and shows the returned account without automatic login', async () => {
    window.history.replaceState({}, '', '/register')
    fetchMock.mockImplementation(async input => String(input).endsWith('/registrations')
      ? ok({ userId: 42, username: 'chen', displayName: '陈女士', role: 'INVESTOR', customerCode: 'C42', initialCash: '50000.00' }, 201)
      : problem(401, 'AUTH_UNAUTHENTICATED', '请先登录'))
    render(<InvestorApp />)
    fireEvent.change(await screen.findByLabelText('用户名'), { target: { value: 'chen' } })
    fireEvent.change(screen.getByLabelText('展示姓名'), { target: { value: '陈女士' } })
    fireEvent.change(screen.getByLabelText('设置密码'), { target: { value: 'Password123' } })
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'Password123' } })
    fireEvent.click(screen.getByRole('button', { name: '创建账号' }))
    expect(await screen.findByRole('heading', { name: '注册成功，请登录' })).toBeInTheDocument()
    expect(screen.getByText(/50,000.00/)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/register')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/registrations', expect.objectContaining({ body: JSON.stringify({ username: 'chen', password: 'Password123', displayName: '陈女士', role: 'INVESTOR' }) })))
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/sessions'))).toBe(false)
  })

  it('rejects an advisor session in the investor site', async () => {
    window.history.replaceState({}, '', '/investor/overview')
    fetchMock.mockImplementation(async () => ok({ ...USER, role: 'ADVISOR' }))
    render(<InvestorApp />)
    expect(await screen.findByRole('heading', { name: '当前账号无法访问用户端' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '我的财富' })).not.toBeInTheDocument()
    expect(window.location.pathname).not.toContain('/advisor')
  })
})
