import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../app/AuthProvider'
import { ApiError, isRecord } from '../api/http'
import { getPurchaseQuote, submitPurchase } from '../api/endpoints/trades'
import type { PurchaseQuote, PurchaseRequest, TradeDetail } from '../api/endpoints/trades'
import { errorMessage } from './useFunds'
import { cents, normalizeAmount } from '../utils/money'
type QuoteState = { status: 'loading' } | { status: 'ready'; data: PurchaseQuote } | { status: 'error'; message: string }
type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'uncertain'; message: string } | { status: 'error'; message: string } | { status: 'success'; order: TradeDetail }
interface Attempt { key: string; body: PurchaseRequest }
function clearAttempt(storageKey: string, key: string) {
  try {
    const raw = sessionStorage.getItem(storageKey)
    const current: unknown = raw ? JSON.parse(raw) : null
    if (isRecord(current) && current.key === key) sessionStorage.removeItem(storageKey)
  } catch { /* Retaining an old key is safer than erasing a newer in-flight request. */ }
}
function restored(storageKey: string, fundId: number): Attempt | null {
  try {
    const raw = sessionStorage.getItem(storageKey)
    const v: unknown = raw ? JSON.parse(raw) : null
    if (isRecord(v) && typeof v.key === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(v.key) && isRecord(v.body) &&
        v.body.fundId === fundId && typeof v.body.amount === 'string' && normalizeAmount(v.body.amount) === v.body.amount && typeof v.body.riskAcknowledged === 'boolean')
      return { key: v.key, body: { fundId, amount: v.body.amount, riskAcknowledged: v.body.riskAcknowledged } }
  } catch { /* No pending request can be recovered from unavailable storage. */ }
  return null
}
export default function usePurchase(fundId: number) {
  const userId = useAuth(state => state.user?.id)
  const storageKey = `fundpilot:pending-purchase:${userId}:${fundId}`
  const [initial] = useState(() => restored(storageKey, fundId))
  const [amount, setAmount] = useState(initial?.body.amount ?? '100.00')
  const [acknowledged, setAcknowledged] = useState(initial?.body.riskAcknowledged ?? false)
  const [quote, setQuote] = useState<QuoteState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  const [submission, setSubmission] = useState<SubmitState>(initial ? { status: 'uncertain', message: '上次提交结果尚未核对，可用原提交凭证重试，或先查看交易记录。' } : { status: 'idle' })
  const attempt = useRef<Attempt | null>(initial)
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const normalized = normalizeAmount(amount)
  const valid = normalized !== null && cents(normalized) >= 10000n
  const locked = submission.status === 'submitting' || submission.status === 'uncertain' || submission.status === 'success'
  useEffect(() => {
    if (!valid || !normalized) return
    let active = true
    setQuote({ status: 'loading' })
    const timer = window.setTimeout(() => {
      getPurchaseQuote(fundId, normalized).then(data => { if (active) setQuote({ status: 'ready', data }) },
        error => { if (active) setQuote({ status: 'error', message: errorMessage(error) }) })
    }, 200)
    return () => { active = false; window.clearTimeout(timer) }
  }, [fundId, normalized, valid, revision])
  const current = valid && quote.status === 'ready' && quote.data.amount === normalized ? quote.data : null
  const insufficient = current !== null && cents(current.amount) > cents(current.availableCash)
  const canSubmit = !!current && !insufficient && (!current.riskAcknowledgmentRequired || acknowledged) && !locked
  function changeAmount(value: string) {
    if (locked) return
    setAmount(value); setAcknowledged(false); setQuote({ status: 'loading' }); setRevision(r => r + 1); setSubmission({ status: 'idle' })
  }
  function finishReviewedAttempt() {
    if (busy.current || submission.status !== 'uncertain' || !attempt.current) return
    clearAttempt(storageKey, attempt.current.key)
    attempt.current = null
    setAcknowledged(false); setSubmission({ status: 'idle' }); setRevision(r => r + 1)
  }
  async function submit() {
    const retry = submission.status === 'uncertain'
    if (busy.current || (!retry && !canSubmit)) return
    busy.current = true
    const pending = attempt.current ?? { key: crypto.randomUUID(), body: { fundId, amount: normalized!, riskAcknowledged: acknowledged } }
    try {
      // Persist before sending so closing/reloading the drawer cannot silently generate a new key.
      sessionStorage.setItem(storageKey, JSON.stringify(pending))
      attempt.current = pending
      setSubmission({ status: 'submitting' })
      const order = await submitPurchase(pending.body, pending.key)
      clearAttempt(storageKey, pending.key)
      if (mounted.current) setSubmission({ status: 'success', order })
    } catch (error) {
      const uncertain = attempt.current !== null && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.status === 409)
      if (!uncertain) {
        attempt.current = null; clearAttempt(storageKey, pending.key)
        if (mounted.current) { setAcknowledged(false); setRevision(r => r + 1) }
      }
      if (mounted.current) setSubmission({ status: uncertain ? 'uncertain' : 'error', message: errorMessage(error) })
    } finally { busy.current = false }
  }
  return { amount, changeAmount, acknowledged, setAcknowledged, quote, current, valid, locked, insufficient, canSubmit, submission, submit, finishReviewedAttempt, retryQuote: () => setRevision(r => r + 1) }
}
