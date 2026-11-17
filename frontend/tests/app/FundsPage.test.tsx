import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InvestorApp from '../../src/app/apps/InvestorApp'
import { sessionUser } from '../authFixtures'
import { setCsrfToken } from '../../src/api/http'

const base = { fundTypeLabel: '权益', riskLevel: 'R4', riskLevelLabel: 'R4 中高风险', categoryLabel: '指数型-股票', styleTags: [], company: '测试公司', manager: '测试经理', fundSize: '2500000000.00', fundSizeAsOfDate: '2026-09-30', latestNav: '2.4710', latestNavDate: '2026-11-13', return1y: '-7.0400', per10kIncome: '0.0000', annualized7d: '0.0000', purchaseStatus: 'OPEN', purchaseStatusLabel: '开放申购', redeemStatus: 'OPEN', redeemStatusLabel: '开放赎回', poolRating: 'UNRATED', poolRatingLabel: '未评级', isPoolEligible: false }
const funds = [ { ...base, id: 1, fundCode: '000311', name: '景顺长城沪深300指数增强A', fundType: 'EQUITY', isFavorite: false }, { ...base, id: 2, fundCode: '000198', name: '天弘余额宝货币', fundType: 'MONEY', fundTypeLabel: '货币', riskLevel: 'R1', return1y: '0.0000', annualized7d: '0.7970', per10kIncome: '0.2150', isFavorite: false } ]
const ok = (data: unknown) => new Response(JSON.stringify({ code: 0, data }), { status: 200 })
let saved: boolean
let failList: boolean
let failWrite: boolean
let currentUser: number
let missingIncome: boolean
beforeEach(() => {
  saved = false; failList = false; failWrite = false; currentUser = 42; missingIncome = false; setCsrfToken(null)
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    if (path.endsWith('/me')) return ok({ ...sessionUser(), id: currentUser })
    if (path.endsWith('/csrf')) return ok({ token: 'token', headerName: 'X-CSRF-Token' })
    if (path.endsWith('/risk-profiles/current')) return new Response(JSON.stringify({ code: 'COMMON_RESOURCE_NOT_FOUND' }), { status: 404 })
    if (path.includes('/favorites/')) {
      if (failWrite) return new Response(JSON.stringify({ detail: '自选保存失败' }), { status: 503 })
      saved = init?.method === 'PUT'
      return saved ? ok({ fundId: 1, isFavorite: true }) : new Response(null, { status: 204 })
    }
    if (path.includes('/navs')) return ok({ fundId: 1, fundCode: '000311', range: '1Y', points: [{ navDate: '2026-11-12', unitNav: '2.4960', accumNav: '2.8360', per10kIncome: '0.0000', annualized7d: '0.0000' }, { navDate: '2026-11-13', unitNav: '2.4710', accumNav: '2.8110', per10kIncome: '0.0000', annualized7d: '0.0000' }] })
    if (/\/funds\/1$/.test(path)) return ok({ ...funds[0], isFavorite: saved, benchmark: '沪深300', inceptionDate: '2013-10-29', fees: { purchase: '0.1200', redeem: '0.5000', manage: '1.0000', custodian: '0.2000', salesService: '0.0000' }, riskMetrics: { annualizedVolatility: '20.0000', maxDrawdown: '-25.0000', window: '1Y', asOfDate: '2026-11-13' }, dataSource: 'EASTMONEY', dataSyncedAt: '2026-11-16T13:00:00Z' })
    if (failList) return new Response(JSON.stringify({ detail: '基金服务暂不可用' }), { status: 503 })
    return ok({ items: funds.map(f => ({ ...f, ...(missingIncome && f.id === 2 ? { annualized7d: null, per10kIncome: null } : {}), isFavorite: f.id === 1 && saved })), total: 2 })
  }))
})
afterEach(() => vi.unstubAllGlobals())
function open(path = '/investor/funds') { window.history.replaceState({}, '', path); render(<InvestorApp />) }
describe('fund marketplace', () => {
  it('restores focus to the triggering fund after changing chart ranges and closing the drawer', async () => {
    open()
    const trigger = await screen.findByRole('button', { name: funds[0].name })
    trigger.focus(); fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('button', { name: '近一月' })
    const range = within(dialog).getByRole('button', { name: '近一月' })
    range.focus(); fireEvent.click(range)
    await within(dialog).findByRole('img', { name: /净值走势/ })
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
  it('clears previous investor favorites when a shared session switches to another investor', async () => {
    open()
    fireEvent.click(await screen.findByRole('button', { name: `自选 ${funds[0].name}` }))
    await screen.findByRole('button', { name: `取消自选 ${funds[0].name}` })
    currentUser = 99; saved = false
    fireEvent(window, new Event('focus'))
    await screen.findByRole('button', { name: `自选 ${funds[0].name}` })
    expect(screen.queryByRole('button', { name: `取消自选 ${funds[0].name}` })).not.toBeInTheDocument()
  })
  it('shows missing money income as undisclosed rather than zero', async () => {
    missingIncome = true; open()
    const card = await screen.findByRole('article', { name: funds[1].name })
    expect(within(card).getAllByText('暂无披露').length).toBeGreaterThan(0)
    expect(within(card).queryByText('0.00%')).not.toBeInTheDocument()
  })
  it('filters by name and type using the URL, retains focus and shows an empty state', async () => {
    open()
    const search = await screen.findByRole('searchbox', { name: '搜索基金名称或代码' })
    await screen.findByText(funds[0].name)
    search.focus(); fireEvent.change(search, { target: { value: '000198' } })
    expect(search).toHaveFocus()
    expect(screen.queryByText(funds[0].name)).not.toBeInTheDocument()
    expect(window.location.search).toContain('keyword=000198')
    fireEvent.click(screen.getByRole('button', { name: '权益' }))
    expect(screen.getByText('没有找到匹配的基金产品')).toBeInTheDocument()
  })
  it('shows money yield and updates the favorites filter after successful writes', async () => {
    open()
    await screen.findByText(funds[0].name)
    expect(screen.getByText('七日年化')).toBeInTheDocument()
    expect(screen.getByText(/未测评/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `自选 ${funds[0].name}` }))
    await screen.findByRole('button', { name: `取消自选 ${funds[0].name}` })
    fireEvent.click(screen.getByRole('button', { name: '我的自选' }))
    expect(screen.queryByText(funds[1].name)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `取消自选 ${funds[0].name}` }))
    await screen.findByText('没有找到匹配的基金产品')
  })
  it('opens accessible details with navs and enters the purchase form', async () => {
    open('/investor/funds?fundId=1')
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('沪深300')
    expect(within(dialog).getByRole('img', { name: /净值走势/ })).toBeInTheDocument()
    expect(within(dialog).getByText(/天天基金/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '申购该基金' }))
    const purchase = await screen.findByRole('dialog', { name: '基金申购' })
    expect(within(purchase).getByRole('textbox', { name: '申购金额（元）' })).toBeInTheDocument()
    expect(window.location.search).toContain('purchase=1')
    fireEvent.keyDown(purchase, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(window.location.search).not.toContain('fundId')
  })
  it('retries loading errors and keeps failed favorites unchanged', async () => {
    failList = true; open()
    await screen.findByText('基金服务暂不可用')
    failList = false
    fireEvent.click(screen.getByRole('button', { name: '重新加载基金' }))
    await screen.findByText(funds[0].name)
    failWrite = true
    fireEvent.click(screen.getByRole('button', { name: `自选 ${funds[0].name}` }))
    await screen.findByText('自选保存失败')
    expect(screen.getByRole('button', { name: `自选 ${funds[0].name}` })).toBeEnabled()
  })
})
