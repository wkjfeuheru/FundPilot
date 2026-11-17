import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InvestorApp from '../src/app/apps/InvestorApp'
import AdvisorApp from '../src/app/apps/AdvisorApp'
import TaApp from '../src/app/apps/TaApp'
import { mockSessionApi } from './authFixtures'
afterEach(() => vi.unstubAllGlobals())
describe('authenticated shell', () => {
  it('keeps the TA site anonymous without product login links or session requests', () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ code: 'TA_DISABLED', detail: 'TA 演示功能未启用' }), { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/ta')
    render(<TaApp />)
    expect(screen.getByRole('heading', { name: 'TA 回执模拟台' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '登录' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '注册开户' })).not.toBeInTheDocument()
    // The implemented anonymous TA page loads its own data, but must never restore a product session.
    expect(fetchMock.mock.calls.every(([path]) => String(path).startsWith('/api/v1/ta/'))).toBe(true)
  })
  it('renders investor navigation and the real account display name', async () => {
    mockSessionApi('INVESTOR')
    window.history.replaceState({}, '', '/investor/overview')
    render(<InvestorApp />)
    expect(await screen.findByRole('heading', { name: '资产总览' })).toBeInTheDocument()
    expect(screen.getByText('布局测试用户')).toBeInTheDocument()
    expect(screen.getByText('基金超市')).toBeInTheDocument()
    expect(screen.queryByText('客户 360')).not.toBeInTheDocument()
  })
  it('renders advisor navigation', async () => {
    mockSessionApi('ADVISOR')
    window.history.replaceState({}, '', '/advisor/overview')
    render(<AdvisorApp />)
    expect(await screen.findByRole('heading', { name: '工作台总览' })).toBeInTheDocument()
    expect(screen.getByText('客户 360')).toBeInTheDocument()
    expect(screen.queryByText('基金超市')).not.toBeInTheDocument()
  })
})
