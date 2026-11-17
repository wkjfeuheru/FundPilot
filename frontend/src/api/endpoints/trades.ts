import { ApiError, http, isRecord } from '../http'
export const TRADE_TYPES = ['PURCHASE', 'REDEMPTION', 'REBALANCE', 'AUTO_INVEST', 'DIVIDEND'] as const
export const TRADE_STATUSES = ['PENDING_TA', 'CONFIRMED', 'FAILED'] as const
export type TradeType = typeof TRADE_TYPES[number]
export type TradeStatus = typeof TRADE_STATUSES[number]
export interface PurchaseRequest { fundId: number; amount: string; riskAcknowledged: boolean }
export interface PurchaseQuote {
  fundId: number; fundCode: string; fundName: string; riskLevel: string; purchaseStatus: string; redeemStatus: string
  navDate: string; unitNav: string; amount: string; feeRate: string; feeAmount: string; estimatedShares: string; availableCash: string
  riskAcknowledgmentRequired: boolean; warnings: string[]
}
export interface CashAccount { userId: number; cashBalance: string; frozenAmount: string; availableCash: string; updatedAt: string }
export interface TaReceipt {
  id: number; receiptNo: string; result: 'SUCCESS' | 'FAILED'; confirmDate: string; navDate: string; unitNav: string
  totalConfirmedAmount: string; totalFee: string; failReason: string; failReasonLabel: string; receivedAt: string
}
export interface TradeOrder {
  id: number; orderCode: string; tradeType: TradeType; tradeTypeLabel: string; status: TradeStatus; statusLabel: string
  tradeDate: string; adviceId: number | null; planId: number | null; totalAmountIn: string; totalAmountOut: string
  totalFee: string; freezeAmount: string; targetLabel: string; remark: string; taReceipt: TaReceipt | null; createdAt: string
}
export interface TradeItem {
  id: number; fundId: number; fundCode: string; fundName: string; direction: 'BUY' | 'SELL'
  amount: string; shares: string; fee: string; confirmedAmount: string; confirmedShares: string
}
export interface TradeDetail extends TradeOrder { items: TradeItem[]; updatedAt: string }
export interface TradePage { content: TradeOrder[]; totalElements: number; totalPages: number; page: number; size: number }
const numberString = (v: unknown): v is string => typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)
const positiveId = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0
const strings = (v: Record<string, unknown>, keys: string[]) => keys.every(k => typeof v[k] === 'string')
const decimals = (v: Record<string, unknown>, keys: string[]) => keys.every(k => numberString(v[k]))
function invalid(): never { throw new ApiError(502, 'INVALID_RESPONSE', '响应异常', '交易数据格式异常，请重试或核对交易记录') }
function isQuote(v: unknown): v is PurchaseQuote {
  return isRecord(v) && positiveId(v.fundId) && strings(v, ['fundCode', 'fundName', 'riskLevel', 'purchaseStatus', 'redeemStatus', 'navDate']) &&
    decimals(v, ['unitNav', 'amount', 'feeRate', 'feeAmount', 'estimatedShares', 'availableCash']) && typeof v.riskAcknowledgmentRequired === 'boolean' &&
    Array.isArray(v.warnings) && v.warnings.every(w => typeof w === 'string')
}
export function isReceipt(v: unknown): v is TaReceipt {
  return isRecord(v) && positiveId(v.id) && (v.result === 'SUCCESS' || v.result === 'FAILED') &&
    strings(v, ['receiptNo', 'confirmDate', 'navDate', 'failReason', 'failReasonLabel', 'receivedAt']) && decimals(v, ['unitNav', 'totalConfirmedAmount', 'totalFee'])
}
export function isOrder(v: unknown): v is TradeOrder {
  return isRecord(v) && positiveId(v.id) && TRADE_TYPES.some(t => t === v.tradeType) && TRADE_STATUSES.some(s => s === v.status) &&
    (v.adviceId === null || positiveId(v.adviceId)) && (v.planId === null || positiveId(v.planId)) &&
    strings(v, ['orderCode', 'tradeTypeLabel', 'statusLabel', 'tradeDate', 'targetLabel', 'remark', 'createdAt']) &&
    decimals(v, ['totalAmountIn', 'totalAmountOut', 'totalFee', 'freezeAmount']) && (v.taReceipt === null || isReceipt(v.taReceipt))
}
function isItem(v: unknown): v is TradeItem {
  return isRecord(v) && positiveId(v.id) && positiveId(v.fundId) && strings(v, ['fundCode', 'fundName']) &&
    (v.direction === 'BUY' || v.direction === 'SELL') && decimals(v, ['amount', 'shares', 'fee', 'confirmedAmount', 'confirmedShares'])
}
export function isDetail(v: unknown): v is TradeDetail {
  if (!isRecord(v) || !isOrder(v)) return false
  const data: Record<string, unknown> = v
  return typeof data.updatedAt === 'string' && Array.isArray(data.items) && data.items.every(isItem)
}
export async function getPurchaseQuote(fundId: number, amount: string): Promise<PurchaseQuote> {
  const v = await http<unknown>('/api/v1/trade-order-quotes/purchases', { method: 'POST', body: JSON.stringify({ fundId, amount }) })
  if (!isQuote(v) || v.fundId !== fundId || v.amount !== amount) invalid()
  return v
}
export async function submitPurchase(body: PurchaseRequest, key: string): Promise<TradeDetail> {
  const v = await http<unknown>('/api/v1/trade-orders/purchases', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) })
  if (!isDetail(v)) invalid()
  return v
}
export async function getCashAccount(): Promise<CashAccount> {
  const v = await http<unknown>('/api/v1/cash-accounts/current')
  if (!isRecord(v) || !positiveId(v.userId) || typeof v.updatedAt !== 'string' || !decimals(v, ['cashBalance', 'frozenAmount', 'availableCash'])) invalid()
  return { userId: v.userId, cashBalance: String(v.cashBalance), frozenAmount: String(v.frozenAmount), availableCash: String(v.availableCash), updatedAt: v.updatedAt }
}
export async function listTrades(query: string): Promise<TradePage> {
  const v = await http<unknown>(`/api/v1/trade-orders?${query}`)
  if (!isRecord(v) || !Array.isArray(v.content) || !v.content.every(isOrder) ||
      !['totalElements', 'totalPages', 'page', 'size'].every(k => typeof v[k] === 'number' && Number.isSafeInteger(v[k]) && Number(v[k]) >= 0)) invalid()
  return { content: v.content, totalElements: Number(v.totalElements), totalPages: Number(v.totalPages), page: Number(v.page), size: Number(v.size) }
}
export async function getTrade(id: number): Promise<TradeDetail> {
  const v = await http<unknown>(`/api/v1/trade-orders/${id}`)
  if (!isDetail(v) || v.id !== id) invalid()
  return v
}
