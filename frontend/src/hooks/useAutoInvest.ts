import { useCallback, useRef, useState } from 'react'
import { getAutoInvest, saveAutoInvest, type AutoInvestPlan, type AutoInvestRequest } from '../api/endpoints/autoInvest'
import { listFunds } from '../api/endpoints/funds'
import { cents, normalizeAmount } from '../utils/money'
import { errorMessage, useRemote } from './useFunds'
export function useAutoInvest() {
  const [revision, setRevision] = useState(0), [saved, setSaved] = useState<AutoInvestPlan | null>(null)
  const remote = useRemote(getAutoInvest, revision)
  return { remote, saved, accept: setSaved, reload: () => { setSaved(null); setRevision(r => r + 1) } }
}
export function useAutoInvestEditor(plan: AutoInvestPlan | null, onSaved: (p: AutoInvestPlan) => void) {
  const [revision, setRevision] = useState(0), load = useCallback(() => listFunds(), [])
  const funds = useRemote(load, revision)
  const [amount, setAmount] = useState(plan?.monthlyAmount ?? ''), [day, setDay] = useState(String(plan?.executeDay ?? 8))
  const [rows, setRows] = useState(plan?.funds.map(f => ({ fundId: String(f.fundId), monthlyAmount: f.monthlyAmount })) ?? [{ fundId: '', monthlyAmount: '' }])
  const [confirmation, setConfirmation] = useState<AutoInvestRequest | null>(null), [error, setError] = useState(''), [pending, setPending] = useState(false)
  const attempt = useRef<{ encoded: string; key: string } | null>(null), inFlight = useRef(false)
  function review() {
    setError('')
    const total = normalizeAmount(amount), items = rows.map(r => ({ fundId: Number(r.fundId), monthlyAmount: normalizeAmount(r.monthlyAmount) }))
    if (!total || cents(total) <= 0n || !/^\d+$/.test(day) || Number(day) < 1 || Number(day) > 28) { setError('请填写大于0的金额，执行日须为1至28日'); return }
    if (items.length < 1 || items.length > 10 || items.some(i => !Number.isSafeInteger(i.fundId) || i.fundId <= 0 || !i.monthlyAmount || cents(i.monthlyAmount) <= 0n)) { setError('请选择基金并填写大于0的每月金额（最多两位小数）'); return }
    if (new Set(items.map(i => i.fundId)).size !== items.length) { setError('定投基金不能重复选择'); return }
    if (items.reduce((sum, i) => sum + cents(i.monthlyAmount ?? '0.00'), 0n) !== cents(total)) { setError('各基金金额合计必须等于每月定投总额'); return }
    setConfirmation({ monthlyAmount: total, executeDay: Number(day), funds: items.map(i => ({ fundId: i.fundId, monthlyAmount: i.monthlyAmount ?? '0.00' })) })
  }
  async function save() {
    if (!confirmation || inFlight.current) return
    inFlight.current = true; setPending(true); setError('')
    const encoded = JSON.stringify(confirmation)
    if (attempt.current?.encoded !== encoded) attempt.current = { encoded, key: crypto.randomUUID() }
    try { onSaved(await saveAutoInvest(confirmation, attempt.current.key)) }
    catch (err) { setError(errorMessage(err)) }
    finally { inFlight.current = false; setPending(false) }
  }
  return { funds, amount, setAmount, day, setDay, rows, setRows, confirmation, back: () => { setConfirmation(null); setError('') }, review, save, error, pending, reload: () => setRevision(r => r + 1) }
}
