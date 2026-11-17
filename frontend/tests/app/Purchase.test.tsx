import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import InvestorApp from '../../src/app/apps/InvestorApp'
import { sessionUser } from '../authFixtures'
import { setCsrfToken } from '../../src/api/http'

const ok = (data: unknown) => new Response(JSON.stringify({ code: 0, data }))
const quote = { fundId: 101, fundCode: '000311', fundName: '指数测试', riskLevel: 'R4', purchaseStatus: 'OPEN', redeemStatus: 'OPEN', navDate: '2026-11-16', unitNav: '2.5000', amount: '100.00', feeRate: '0.1200', feeAmount: '0.12', estimatedShares: '39.9520', availableCash: '50000.00', riskAcknowledgmentRequired: true, warnings: ['净值为最近披露口径'] }
const order = { id: 1, orderCode: 'T-20261116-001', tradeType: 'PURCHASE', tradeTypeLabel: '基金申购', status: 'PENDING_TA', statusLabel: '待登记确认', tradeDate: '2026-11-16', adviceId: null, planId: null, totalAmountIn: '100.00', totalAmountOut: '0.00', totalFee: '0.12', freezeAmount: '100.00', targetLabel: '指数测试', remark: '', taReceipt: null, createdAt: '2026-11-16T14:00:00Z', updatedAt: '2026-11-16T14:00:00Z', items: [{ id: 1, fundId: 101, fundCode: '000311', fundName: '指数测试', direction: 'BUY', amount: '100.00', shares: '0.0000', fee: '0.12', confirmedAmount: '0.00', confirmedShares: '0.0000' }] }
let submits: { key: string | null; body: string }[]
let failSubmit: boolean
let quoteAmount: string
let requiresRisk: boolean
let delayFirstSubmit: boolean
let originalSubmit: ((response: Response) => void) | undefined
let delayedQuote: ((response: Response) => void) | undefined
beforeEach(() => {
  sessionStorage.clear(); setCsrfToken(null); submits = []; failSubmit = false; quoteAmount = ''; delayedQuote = undefined; requiresRisk = true; delayFirstSubmit = false; originalSubmit = undefined
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    if (path.endsWith('/me')) return ok(sessionUser())
    if (path.endsWith('/csrf')) return ok({ token: 'test', headerName: 'X-CSRF-Token' })
    if (path.endsWith('/risk-profiles/current')) return new Response(JSON.stringify({ code: 'COMMON_RESOURCE_NOT_FOUND' }), { status: 404 })
    if (path.endsWith('/funds')) return ok({ items: [], total: 0 })
    if (path.endsWith('/trade-order-quotes/purchases')) {
      const body: { amount: string } = JSON.parse(String(init?.body)); quoteAmount = body.amount
      if (body.amount === '200.00') return new Promise<Response>(resolve => { delayedQuote = resolve })
      return ok({ ...quote, amount: body.amount, riskAcknowledgmentRequired: requiresRisk })
    }
    if (path.endsWith('/trade-orders/purchases')) {
      submits.push({ key: new Headers(init?.headers).get('Idempotency-Key'), body: String(init?.body) })
      if (delayFirstSubmit && submits.length === 1) return new Promise<Response>(resolve => { originalSubmit = resolve })
      if (failSubmit) throw new TypeError('lost response')
      return ok(order)
    }
    if (path.endsWith('/cash-accounts/current')) return ok({ userId: 42, cashBalance: '50000.00', frozenAmount: '100.00', availableCash: '49900.00', updatedAt: order.updatedAt })
    if (/\/trade-orders\/1$/.test(path)) return ok(order)
    if (path.includes('/trade-orders')) return ok({ content: [order], totalElements: 1, totalPages: 1, page: 1, size: 20 })
    throw new Error(`Unexpected request ${path}`)
  }))
})
afterEach(() => vi.unstubAllGlobals())
function open(path = '/investor/funds?fundId=101&purchase=1') { window.history.replaceState({}, '', path); return render(<InvestorApp />) }
it('requires explicit risk confirmation, submits once and shows pending rather than settled shares', async () => {
  open()
  const submit = await screen.findByRole('button', { name: '确认申购并冻结资金' })
  await screen.findByText('39.9520')
  expect(submit).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
  fireEvent.click(submit); fireEvent.click(submit)
  await screen.findByText('申购已提交，待登记确认')
  expect(submits).toHaveLength(1)
  expect(JSON.parse(submits[0].body)).toEqual({ fundId: 101, amount: '100.00', riskAcknowledged: true })
  expect(submits[0].key).toMatch(/^[A-Za-z0-9_-]{16,64}$/)
  fireEvent.click(screen.getByRole('link', { name: '查看这笔交易' }))
  await screen.findByRole('heading', { name: '交易记录', level: 1 })
  const dialog = await screen.findByRole('dialog')
  expect(await within(dialog).findByText('T-20261116-001')).toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: /确认成功/ })).not.toBeInTheDocument()
})
it('keeps the same key and immutable request after an uncertain network result', async () => {
  failSubmit = true; open()
  await screen.findByText('39.9520')
  fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
  fireEvent.click(screen.getByRole('button', { name: '确认申购并冻结资金' }))
  const retry = await screen.findByRole('button', { name: '用原提交凭证重试' })
  expect(screen.getByRole('textbox', { name: '申购金额（元）' })).toBeDisabled()
  failSubmit = false; fireEvent.click(retry)
  await screen.findByText('申购已提交，待登记确认')
  expect(submits).toHaveLength(2); expect(submits[1]).toEqual(submits[0])
})
it('invalidates the quote and risk acknowledgement immediately when amount changes', async () => {
  open(); await screen.findByText('39.9520')
  fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
  fireEvent.change(screen.getByRole('textbox', { name: '申购金额（元）' }), { target: { value: '200' } })
  expect(screen.getByRole('button', { name: '确认申购并冻结资金' })).toBeDisabled()
  await waitFor(() => expect(quoteAmount).toBe('200.00'))
  fireEvent.change(screen.getByRole('textbox', { name: '申购金额（元）' }), { target: { value: '300' } })
  await waitFor(() => expect(quoteAmount).toBe('300.00'))
  delayedQuote?.(ok({ ...quote, amount: '200.00', estimatedShares: 'STALE' }))
  await screen.findByRole('checkbox', { name: /我已了解/ })
  expect(screen.getByRole('checkbox', { name: /我已了解/ })).not.toBeChecked()
  expect(screen.queryByText('STALE')).not.toBeInTheDocument()
})
it('shows account freezes and writes transaction filters to the URL', async () => {
  open('/investor/transactions')
  await screen.findByText('49900.00')
  fireEvent.change(screen.getByRole('combobox', { name: '交易状态' }), { target: { value: 'PENDING_TA' } })
  expect(window.location.search).toContain('status=PENDING_TA')
  expect(await screen.findByRole('button', { name: '查看 T-20261116-001' })).toBeInTheDocument()
})
it('recalculates equivalent decimal edits and prevents invalid or insufficient purchases', async () => {
  requiresRisk = false; open(); await screen.findByText('39.9520')
  const amount = screen.getByRole('textbox', { name: '申购金额（元）' })
  fireEvent.change(amount, { target: { value: '100.0' } })
  await waitFor(() => expect(screen.getByRole('button', { name: '确认申购并冻结资金' })).toBeEnabled())
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  fireEvent.change(amount, { target: { value: '99.99' } })
  expect(screen.getByRole('button', { name: '确认申购并冻结资金' })).toBeDisabled()
  fireEvent.change(amount, { target: { value: '50001' } })
  await screen.findByText('可用现金不足，请核对待登记冻结金额。')
  expect(screen.getByRole('button', { name: '确认申购并冻结资金' })).toBeDisabled()
  expect(submits).toHaveLength(0)
})
it('recovers an uncertain attempt after reopening without generating another key', async () => {
  failSubmit = true; const view = open(); await screen.findByText('39.9520')
  fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
  fireEvent.click(screen.getByRole('button', { name: '确认申购并冻结资金' }))
  await screen.findByRole('button', { name: '用原提交凭证重试' })
  view.unmount(); failSubmit = false; open()
  fireEvent.click(await screen.findByRole('button', { name: '用原提交凭证重试' }))
  await screen.findByText('申购已提交，待登记确认')
  expect(submits).toHaveLength(2); expect(submits[1]).toEqual(submits[0])
})
it('does not let a late response clear the recovery key of a newer purchase', async () => {
  delayFirstSubmit = true; requiresRisk = false
  const a = open(); await screen.findByText('39.9520')
  fireEvent.click(screen.getByRole('button', { name: '确认申购并冻结资金' }))
  await waitFor(() => expect(submits).toHaveLength(1)); a.unmount()
  const retryA = open(); fireEvent.click(await screen.findByRole('button', { name: '用原提交凭证重试' }))
  await screen.findByText('申购已提交，待登记确认'); retryA.unmount()
  failSubmit = true; const b = open(); await screen.findByText('39.9520')
  fireEvent.click(screen.getByRole('button', { name: '确认申购并冻结资金' }))
  await screen.findByRole('button', { name: '用原提交凭证重试' })
  const keyB = submits[2].key; expect(keyB).not.toBe(submits[0].key)
  await act(async () => { originalSubmit?.(ok(order)) })
  await waitFor(() => expect(sessionStorage.getItem('fundpilot:pending-purchase:42:101')).toContain(keyB))
  b.unmount(); failSubmit = false; open()
  fireEvent.click(await screen.findByRole('button', { name: '用原提交凭证重试' }))
  await screen.findByText('申购已提交，待登记确认')
  expect(submits[3].key).toBe(keyB)
})
it('requires explicit reconciliation before releasing an uncertain attempt', async () => {
  failSubmit = true; requiresRisk = false; open(); await screen.findByText('39.9520')
  fireEvent.click(screen.getByRole('button', { name: '确认申购并冻结资金' }))
  const finish = await screen.findByRole('button', { name: '结束已核对的尝试' })
  expect(finish).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: /我已核对交易记录/ }))
  fireEvent.click(finish)
  await waitFor(() => expect(screen.getByRole('button', { name: '确认申购并冻结资金' })).toBeEnabled())
  expect(sessionStorage.getItem('fundpilot:pending-purchase:42:101')).toBeNull()
  expect(submits).toHaveLength(1)
})
