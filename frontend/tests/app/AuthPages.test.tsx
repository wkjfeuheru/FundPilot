import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InvestorApp from '../../src/app/apps/InvestorApp'
import AdvisorApp from '../../src/app/apps/AdvisorApp'
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 'AUTH_UNAUTHENTICATED', detail: '请先登录' }), { status: 401 }))))
afterEach(() => vi.unstubAllGlobals())
describe('auth pages as site entries', () => {
  it('renders the investor login form at the site root', async () => {
    window.history.replaceState({}, '', '/')
    render(<InvestorApp />)
    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument()
    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
  })
  it('renders the advisor login copy at the advisor site root', async () => {
    window.history.replaceState({}, '', '/')
    render(<AdvisorApp />)
    expect(await screen.findByText('登录 FundPilot PRO，进入投顾工作台。')).toBeInTheDocument()
  })
  it('blocks invalid input without sending a login request', async () => {
    window.history.replaceState({}, '', '/login')
    render(<InvestorApp />)
    fireEvent.click(await screen.findByRole('button', { name: '登录' }))
    expect(screen.getByLabelText('用户名')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('密码')).toHaveAttribute('aria-invalid', 'true')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('links between login and register within the same site', async () => {
    window.history.replaceState({}, '', '/login')
    render(<InvestorApp />)
    fireEvent.click(await screen.findByRole('link', { name: '立即注册' }))
    expect(await screen.findByRole('heading', { name: '创建投资者账号' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '返回登录' }))
    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument()
  })
  it('prevents registration when password confirmation differs', async () => {
    window.history.replaceState({}, '', '/register')
    render(<AdvisorApp />)
    fireEvent.change(await screen.findByLabelText('用户名'), { target: { value: 'advisor' } })
    fireEvent.change(screen.getByLabelText('展示姓名'), { target: { value: '顾问' } })
    fireEvent.change(screen.getByLabelText('设置密码'), { target: { value: 'Password123' } })
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'Password456' } })
    fireEvent.click(screen.getByRole('button', { name: '创建账号' }))
    expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
