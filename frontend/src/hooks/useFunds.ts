import { useCallback, useEffect, useRef, useState } from 'react'
import { getSuitability, listFunds, updateFavorite } from '../api/endpoints/funds'
import type { FundSummary, Suitability } from '../api/endpoints/funds'
export type Remote<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string }
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : '服务暂不可用，请重试'
export function useRemote<T>(load: () => Promise<T>, revision = 0): Remote<T> {
  const [state, setState] = useState<Remote<T>>({ status: 'loading' })
  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    load().then(data => { if (active) setState({ status: 'ready', data }) }, error => { if (active) setState({ status: 'error', message: errorMessage(error) }) })
    return () => { active = false }
  }, [load, revision])
  return state
}
export default function useFunds() {
  const [revision, setRevision] = useState(0)
  const load = useCallback(() => listFunds(), [])
  const remote = useRemote(load, revision)
  const suitability = useRemote<Suitability | null>(getSuitability, revision)
  const [overrides, setOverrides] = useState<Record<number, boolean>>({})
  const [pending, setPending] = useState<Set<number>>(new Set())
  const inFlight = useRef(new Set<number>())
  const mounted = useRef(true)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const funds = remote.status === 'ready' ? remote.data.map(f => ({ ...f, isFavorite: overrides[f.id] ?? f.isFavorite })) : []
  async function toggle(fund: FundSummary) {
    if (inFlight.current.has(fund.id)) return
    inFlight.current.add(fund.id); setPending(new Set(inFlight.current)); setNotice(null)
    try {
      await updateFavorite(fund.id, !fund.isFavorite)
      if (mounted.current) {
        setOverrides(previous => ({ ...previous, [fund.id]: !fund.isFavorite }))
        setNotice({ kind: 'success', text: fund.isFavorite ? '已取消自选' : '已加入自选' })
      }
    } catch (error) { if (mounted.current) setNotice({ kind: 'error', text: errorMessage(error) }) }
    finally { inFlight.current.delete(fund.id); if (mounted.current) setPending(new Set(inFlight.current)) }
  }
  return { remote, suitability, funds, pending, notice, toggle, reload: () => setRevision(r => r + 1) }
}
