import { ApiError, http, isRecord } from '../http'
import { isDetail, isOrder, isReceipt } from './trades'
import type { TaReceipt, TradeDetail, TradeOrder } from './trades'

export interface TaSummary { pendingCount: number; cashBalance: string; frozenAmount: string; availableCash: string; accountCount: number; generatedAt: string }
export interface TaOrder extends TradeOrder { customerUserId: number; customerName: string }
export interface ReceiptView extends TaReceipt { orderCode: string; tradeType: string; targetLabel: string }
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface ReceiptPreview {
  order: TradeDetail; confirmDate: string; navDate: string; unitNav: string; totalConfirmedAmount: string; totalFee: string
  items: { fundId: number; fundName: string; confirmedShares: string; confirmedAmount: string; fee: string }[]
}
export interface ReceiptCommand { result: 'SUCCESS' | 'FAILED'; failReason?: string }
export interface BatchResult { total: number; succeeded: number; failed: { orderId: number; code: string; message: string }[]; items: TradeOrder[] }
const decimal = (v: unknown): v is string => typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
function invalid(): never { throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '回执数据格式异常，请刷新核对') }
function page<T>(v: unknown, guard: (item: unknown) => item is T): Page<T> {
  if (!isRecord(v) || !Array.isArray(v.content) || !v.content.every(guard) || !integer(v.page) || !integer(v.size) || !integer(v.totalPages) || !integer(v.totalElements)) invalid()
  return { content: v.content, page: v.page, size: v.size, totalPages: v.totalPages, totalElements: v.totalElements }
}
export async function getTaSummary(): Promise<TaSummary> {
  const v = await http<unknown>('/api/v1/ta/summary')
  if (!isRecord(v) || !integer(v.pendingCount) || !integer(v.accountCount) || typeof v.generatedAt !== 'string' || !decimal(v.cashBalance) || !decimal(v.frozenAmount) || !decimal(v.availableCash)) invalid()
  return { pendingCount: v.pendingCount, accountCount: v.accountCount, generatedAt: v.generatedAt, cashBalance: v.cashBalance, frozenAmount: v.frozenAmount, availableCash: v.availableCash }
}
function isTaOrder(v: unknown): v is TaOrder {
  if (!isRecord(v) || !isOrder(v)) return false
  const data: Record<string, unknown> = v
  return integer(data.customerUserId) && data.customerUserId > 0 && typeof data.customerName === 'string'
}
function isReceiptView(v: unknown): v is ReceiptView {
  if (!isRecord(v) || !isReceipt(v)) return false
  const data: Record<string, unknown> = v
  return ['orderCode', 'tradeType', 'targetLabel'].every(k => typeof data[k] === 'string')
}
export async function listTaOrders(current: number) { return page(await http<unknown>(`/api/v1/ta/trade-orders?page=${current}&size=20`), isTaOrder) }
export async function listTaReceipts(current: number) { return page(await http<unknown>(`/api/v1/ta/receipts?page=${current}&size=20`), isReceiptView) }
function isPreview(v: unknown): v is ReceiptPreview {
  return isRecord(v) && isDetail(v.order) && typeof v.confirmDate === 'string' && typeof v.navDate === 'string' &&
    ['unitNav', 'totalConfirmedAmount', 'totalFee'].every(k => decimal(v[k])) && Array.isArray(v.items) && v.items.every(i =>
      isRecord(i) && integer(i.fundId) && typeof i.fundName === 'string' && ['confirmedShares', 'confirmedAmount', 'fee'].every(k => decimal(i[k])))
}
export async function getReceiptPreview(id: number): Promise<ReceiptPreview> {
  const v = await http<unknown>(`/api/v1/ta/trade-orders/${id}/receipt-preview`)
  if (!isPreview(v) || v.order.id !== id) invalid()
  return v
}
export async function createTaReceipt(id: number, body: ReceiptCommand, key: string) {
  const v = await http<unknown>(`/api/v1/ta/trade-orders/${id}/ta-receipts`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) })
  if (!isDetail(v) || v.id !== id) invalid()
  return v
}
function isBatch(v: unknown): v is BatchResult {
  return isRecord(v) && integer(v.total) && integer(v.succeeded) && Array.isArray(v.failed) && v.failed.every(f =>
    isRecord(f) && integer(f.orderId) && typeof f.code === 'string' && typeof f.message === 'string') && Array.isArray(v.items) && v.items.every(isOrder)
}
export async function createTaBatch(key: string): Promise<BatchResult> {
  const v = await http<unknown>('/api/v1/ta/receipt-batches', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ result: 'SUCCESS' }) })
  if (!isBatch(v)) invalid()
  return v
}
