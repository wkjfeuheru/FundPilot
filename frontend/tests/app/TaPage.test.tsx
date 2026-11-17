import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import TaApp from '../../src/app/apps/TaApp'

const order = { id: 301, orderCode: 'T-TEST-301', tradeType: 'PURCHASE', tradeTypeLabel: '基金申购', status: 'PENDING_TA', statusLabel: '待登记确认', tradeDate: '2026-11-13', adviceId: null, planId: null, totalAmountIn: '1000.00', totalAmountOut: '0.00', totalFee: '1.20', freezeAmount: '1000.00', targetLabel: '测试基金', remark: '', taReceipt: null, createdAt: '2026-11-13T06:00:00Z', updatedAt: '2026-11-13T06:00:00Z', items: [], customerUserId: 101, customerName: '演示投资者' }
const receipt = { id: 1, receiptNo: 'TA20261116001', result: 'SUCCESS', confirmDate: '2026-11-16', navDate: '2026-11-13', unitNav: '2.5000', totalConfirmedAmount: '1000.00', totalFee: '1.20', failReason: 'NONE', failReasonLabel: '无', receivedAt: '2026-11-17T00:00:00Z' }
const ok = (data: unknown) => new Response(JSON.stringify({ code: 0, data }))
let calls: { path: string; key: string | null; body: string }[]
let disabled: boolean
let uncertain: boolean
let confirmed: boolean
beforeEach(() => {
  sessionStorage.clear(); calls = []; disabled = false; uncertain = false; confirmed = false
  window.history.replaceState({}, '', '/ta')
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    if (disabled) return new Response(JSON.stringify({ code: 'TA_DISABLED', detail: 'TA 演示功能未启用' }), { status: 404 })
    if (path.endsWith('/summary')) return ok({ pendingCount: confirmed ? 0 : 1, cashBalance: confirmed ? '49000.00' : '50000.00', frozenAmount: confirmed ? '0.00' : '1000.00', availableCash: '49000.00', accountCount: 1, generatedAt: receipt.receivedAt })
    if (path.includes('receipt-preview')) return ok({ order, receiptNo: receipt.receiptNo, confirmDate: receipt.confirmDate, navDate: receipt.navDate, unitNav: '2.5000', totalConfirmedAmount: '1000.00', totalFee: '1.20', items: [{ fundId: 201, fundName: '测试基金', confirmedShares: '399.5200', confirmedAmount: '1000.00', fee: '1.20' }] })
    if (init?.method === 'POST') {
      calls.push({ path, key: new Headers(init.headers).get('Idempotency-Key'), body: String(init.body) })
      if (uncertain) throw new TypeError('lost response')
      confirmed = true
      if (path.endsWith('/receipt-batches')) return ok({ total: 1, succeeded: 0, failed: [{ orderId: 301, code: 'TA_NAV_NOT_AVAILABLE', message: '缺少 T 日净值' }], items: [] })
      return ok({ ...order, status: 'CONFIRMED', statusLabel: '确认成功', taReceipt: receipt })
    }
    if (path.includes('/receipts')) return ok({ content: [], page: 1, size: 20, totalPages: 0, totalElements: 0 })
    if (path.includes('/trade-orders')) return ok({ content: confirmed ? [] : [order], page: 1, size: 20, totalPages: 1, totalElements: confirmed ? 0 : 1 })
    throw new Error(`unexpected ${path}`)
  }))
})
afterEach(() => vi.unstubAllGlobals())
it('previews server-calculated values and submits exactly once before refreshing linked balances', async () => {
  render(<TaApp />)
  fireEvent.click(await screen.findByRole('button', { name: '提交回执 T-TEST-301' }))
  const dialog = await screen.findByRole('dialog')
  await within(dialog).findByText('399.5200')
  const submit = within(dialog).getByRole('button', { name: '确认提交回执' })
  fireEvent.click(submit); fireEvent.click(submit)
  await screen.findByText('回执已提交')
  expect(calls).toHaveLength(1)
  expect(JSON.parse(calls[0].body)).toEqual({ result: 'SUCCESS' })
  expect(calls[0].body).not.toContain('unitNav')
  expect(await screen.findByText('暂无待登记交易')).toBeInTheDocument()
})
it('requires a failure reason and preserves the key and body when retrying uncertain results', async () => {
  uncertain = true; render(<TaApp />)
  fireEvent.click(await screen.findByRole('button', { name: '提交回执 T-TEST-301' }))
  await screen.findByText('399.5200')
  fireEvent.click(screen.getByRole('radio', { name: '确认失败' }))
  expect(screen.getByRole('button', { name: '确认提交回执' })).toBeDisabled()
  fireEvent.change(screen.getByRole('combobox', { name: '失败原因' }), { target: { value: 'PURCHASE_SUSPENDED' } })
  fireEvent.click(screen.getByRole('button', { name: '确认提交回执' }))
  const retry = await screen.findByRole('button', { name: '沿用原凭证重试' })
  uncertain = false; fireEvent.click(retry)
  await screen.findByText('回执已提交')
  expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0])
})
it('requires batch confirmation and displays partial failures rather than claiming all succeeded', async () => {
  render(<TaApp />); await screen.findByRole('button', { name: '提交回执 T-TEST-301' })
  fireEvent.click(screen.getByRole('button', { name: '全部确认成功' }))
  expect(calls).toHaveLength(0)
  fireEvent.click(await screen.findByRole('button', { name: '确认批量提交' }))
  await screen.findByText(/缺少 T 日净值/)
  expect(calls).toHaveLength(1)
})
it('clearly shows disabled TA without exposing write controls', async () => {
  disabled = true; render(<TaApp />)
  await waitFor(() => expect(screen.getByText('TA 演示功能未启用')).toBeInTheDocument())
  expect(screen.queryByRole('button', { name: '全部确认成功' })).not.toBeInTheDocument()
})
