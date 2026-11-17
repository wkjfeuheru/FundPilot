import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import InvestorApp from '../../src/app/apps/InvestorApp'
import { sessionUser } from '../authFixtures'
import { setCsrfToken } from '../../src/api/http'

const ok = (data: unknown) => new Response(JSON.stringify({ code: 0, data }))
const overview = { totalAsset: '50000.00', holdingMarketValue: '0.00', cashBalance: '50000.00', availableCash: '49000.00', cumulativePnl: '0.00', cumulativePnlRate: '0.00', last30dPnl: '0.00', portfolioRiskLevel: null, portfolioRiskLevelLabel: '未测评', matchesProfile: false, allocation: ['EQUITY', 'BOND', 'MONEY', 'GOLD'].map((assetClass, i) => ({ assetClass, assetClassLabel: ['权益', '债券', '货币', '黄金'][i], weight: '0.00', marketValue: '0.00' })), topHoldings: [], insights: [{ type: 'KYC', title: '请完成测评', description: '暂无有效画像', tag: '待完善', tagLevel: 'WARNING', sourceRuleCode: null }], asOfDate: null, updatedAt: '2026-11-17T01:00:00Z' }
let trendCalls: string[]
let saved: { body: string; key: string | null }[]
let failOverview: boolean
let failPlan: boolean
beforeEach(() => {
  sessionStorage.clear(); setCsrfToken(null); trendCalls = []; saved = []; failOverview = false; failPlan = false
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    if (path.endsWith('/me')) return ok(sessionUser())
    if (path.endsWith('/csrf')) return ok({ token: 'test', headerName: 'X-CSRF-Token' })
    if (path.endsWith('/asset-overviews/current')) return failOverview ? new Response(JSON.stringify({ detail: '总览暂不可用' }), { status: 503 }) : ok(overview)
    if (path.includes('/asset-trends/current')) { trendCalls.push(path); return ok({ range: '1M', points: [], summary: { portfolioReturnRate: '0.00', benchmarkReturnRate: '0.00', excessReturnRate: '0.00' } }) }
    if (path.endsWith('/cash-accounts/current')) return ok({ userId: 1, cashBalance: '50000.00', frozenAmount: '1000.00', availableCash: '49000.00', updatedAt: overview.updatedAt })
    if (path.includes('/trade-orders')) return ok({ content: [], page: 1, size: 20, totalPages: 0, totalElements: 0 })
    if (path.endsWith('/auto-invest-plans/current')) {
      if (init?.method === 'PUT') { saved.push({ body: String(init.body), key: new Headers(init.headers).get('Idempotency-Key') }); if (failPlan) throw new TypeError('lost response'); return ok({ id: 1, userId: 1, monthlyAmount: '300.00', executeDay: 8, status: 'ACTIVE', funds: [{ fundId: 901, fundCode: '900001', fundName: '定投测试基金', monthlyAmount: '300.00' }], createdAt: overview.updatedAt, updatedAt: overview.updatedAt }) }
      return new Response(JSON.stringify({ code: 'COMMON_RESOURCE_NOT_FOUND' }), { status: 404 })
    }
    if (path.endsWith('/funds')) return ok({ items: [{ id: 901, fundCode: '900001', name: '定投测试基金', fundType: 'EQUITY', fundTypeLabel: '权益', riskLevel: 'R4', riskLevelLabel: '中高风险', categoryLabel: '权益', styleTags: [], company: '', manager: '', fundSize: '0', fundSizeAsOfDate: null, latestNav: '1', latestNavDate: '2026-11-17', return1y: '0', per10kIncome: null, annualized7d: null, purchaseStatus: 'OPEN', purchaseStatusLabel: '开放', redeemStatus: 'OPEN', redeemStatusLabel: '开放', poolRating: '', poolRatingLabel: '', isFavorite: false, isPoolEligible: false }], total: 1 })
    throw new Error(`Unexpected API ${path}`)
  }))
})
afterEach(() => vi.unstubAllGlobals())
it('renders real cash-only overview, empty snapshots and range requests', async () => {
  window.history.replaceState(null, '', '/investor/overview'); render(<InvestorApp />)
  expect(await screen.findByText('50,000.00')).toBeInTheDocument()
  expect(screen.getByText('未测评')).toBeInTheDocument()
  expect(await screen.findByText(/暂无资产日快照/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '3M' }))
  await waitFor(() => expect(trendCalls.some(p => p.includes('range=3M'))).toBe(true))
  fireEvent.click(screen.getByRole('button', { name: '查看 AI 组合诊断' }))
  expect(await screen.findByText(/帮我诊断当前组合/)).toBeInTheDocument()
})
it('retries overview failure without hiding trend', async () => {
  failOverview = true; window.history.replaceState(null, '', '/investor/overview'); render(<InvestorApp />)
  expect(await screen.findByText('总览暂不可用')).toBeInTheDocument()
  failOverview = false; fireEvent.click(screen.getByRole('button', { name: '重试资产总览' }))
  expect(await screen.findByText('50,000.00')).toBeInTheDocument()
})
it('requires second confirmation before saving a new plan', async () => {
  window.history.replaceState(null, '', '/investor/transactions'); render(<InvestorApp />)
  fireEvent.click(await screen.findByRole('button', { name: '创建定投计划' }))
  await screen.findByRole('option', { name: /定投测试基金/ })
  fireEvent.change(screen.getByLabelText('每月定投总额（元）'), { target: { value: '300' } })
  fireEvent.change(screen.getByLabelText('每月执行日'), { target: { value: '8' } })
  fireEvent.change(screen.getByLabelText('基金 1'), { target: { value: '901' } })
  fireEvent.change(screen.getByLabelText('基金 1 每月金额（元）'), { target: { value: '300' } })
  fireEvent.click(screen.getByRole('button', { name: '核对定投计划' }))
  expect(saved).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: '确认保存计划' }))
  await waitFor(() => expect(saved).toHaveLength(1))
  expect(JSON.parse(saved[0].body)).toEqual({ monthlyAmount: '300.00', executeDay: 8, funds: [{ fundId: 901, monthlyAmount: '300.00' }] })
  expect(saved[0].key).toBeTruthy()
  expect(await screen.findByText('定投计划已保存')).toBeInTheDocument()
})
async function editPlan() {
  window.history.replaceState(null, '', '/investor/transactions'); render(<InvestorApp />)
  fireEvent.click(await screen.findByRole('button', { name: '创建定投计划' }))
  await screen.findByRole('option', { name: /定投测试基金/ })
  fireEvent.change(screen.getByLabelText('每月定投总额（元）'), { target: { value: '300.01' } })
  fireEvent.change(screen.getByLabelText('基金 1'), { target: { value: '901' } })
  fireEvent.change(screen.getByLabelText('基金 1 每月金额（元）'), { target: { value: '300.00' } })
}
it('blocks a one-cent allocation mismatch and duplicate funds before confirmation', async () => {
  await editPlan(); fireEvent.click(screen.getByRole('button', { name: '核对定投计划' }))
  expect(await screen.findByText('各基金金额合计必须等于每月定投总额')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '确认保存计划' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '添加基金' }))
  fireEvent.change(screen.getByLabelText('基金 2'), { target: { value: '901' } })
  fireEvent.change(screen.getByLabelText('基金 2 每月金额（元）'), { target: { value: '0.01' } })
  fireEvent.click(screen.getByRole('button', { name: '核对定投计划' }))
  expect(await screen.findByText('定投基金不能重复选择')).toBeInTheDocument()
  expect(saved).toHaveLength(0)
})
it('reuses the original key and payload after an uncertain save result', async () => {
  await editPlan(); failPlan = true
  fireEvent.change(screen.getByLabelText('每月定投总额（元）'), { target: { value: '300.00' } })
  fireEvent.click(screen.getByRole('button', { name: '核对定投计划' }))
  fireEvent.click(screen.getByRole('button', { name: '确认保存计划' }))
  await screen.findByText('无法连接服务，请检查网络后重试'); failPlan = false
  fireEvent.click(screen.getByRole('button', { name: '确认保存计划' }))
  await screen.findByText('定投计划已保存')
  expect(saved).toHaveLength(2); expect(saved[1]).toEqual(saved[0])
})
