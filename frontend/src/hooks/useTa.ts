import { useCallback, useRef, useState } from 'react'
import { ApiError, isRecord } from '../api/http'
import { createTaBatch, createTaReceipt, getReceiptPreview, getTaSummary, listTaOrders, listTaReceipts } from '../api/endpoints/ta'
import type { BatchResult, ReceiptCommand } from '../api/endpoints/ta'
import { errorMessage, useRemote } from './useFunds'
import useSettlementRefresh from './useSettlementRefresh'

export function useTa(orderPage: number, receiptPage: number) {
  const { revision, reload } = useSettlementRefresh()
  const orders = useRemote(useCallback(() => listTaOrders(orderPage), [orderPage]), revision)
  const receipts = useRemote(useCallback(() => listTaReceipts(receiptPage), [receiptPage]), revision)
  return { summary: useRemote(getTaSummary, revision), orders, receipts, reload }
}
export function useReceiptPreview(id: number | null) {
  const [revision, setRevision] = useState(0)
  const preview = useRemote(useCallback(() => id === null ? Promise.resolve(null) : getReceiptPreview(id), [id]), revision)
  return { ...preview, reload: () => setRevision(r => r + 1) }
}
interface Attempt { key: string; orderId: number | null; body: ReceiptCommand }
const STORAGE = 'fundpilot:ta:pending-receipt'
function restore(): Attempt | null {
  try {
    const raw = sessionStorage.getItem(STORAGE)
    const v: unknown = raw ? JSON.parse(raw) : null
    if (isRecord(v) && typeof v.key === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(v.key) &&
      (v.orderId === null || (typeof v.orderId === 'number' && Number.isSafeInteger(v.orderId) && v.orderId > 0)) && isRecord(v.body) &&
      (v.body.result === 'SUCCESS' || v.body.result === 'FAILED') && (v.body.failReason === undefined || typeof v.body.failReason === 'string')) {
      return { key: v.key, orderId: v.orderId, body: { result: v.body.result, ...(typeof v.body.failReason === 'string' ? { failReason: v.body.failReason } : {}) } }
    }
    return null
  } catch { return null }
}
export function useTaSubmission(onComplete: (batch: BatchResult | null) => void) {
  const [attempt, setAttempt] = useState<Attempt | null>(restore)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const current = useRef(attempt)
  function clear() {
    if (busy.current) return
    sessionStorage.removeItem(STORAGE); current.current = null; setAttempt(null); setError('')
  }
  async function submit(orderId: number | null, body: ReceiptCommand) {
    if (busy.current) return
    const next = current.current ?? { orderId, body, key: crypto.randomUUID() }
    // Refuse sending unless a refresh can recover the exact operation and key.
    try { sessionStorage.setItem(STORAGE, JSON.stringify(next)) }
    catch { setError('无法保存重试凭证，请允许此站点使用会话存储后重试'); return }
    busy.current = true; current.current = next; setAttempt(next); setPending(true); setError('')
    try {
      const batch = next.orderId === null ? await createTaBatch(next.key) : (await createTaReceipt(next.orderId, next.body, next.key), null)
      if (restore()?.key === next.key) sessionStorage.removeItem(STORAGE)
      current.current = null; setAttempt(null); onComplete(batch)
    } catch (e) {
      setError(errorMessage(e))
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 409) {
        if (restore()?.key === next.key) sessionStorage.removeItem(STORAGE)
        current.current = null; setAttempt(null)
      }
    } finally { busy.current = false; setPending(false) }
  }
  return { attempt, pending, error, submit, clear }
}
