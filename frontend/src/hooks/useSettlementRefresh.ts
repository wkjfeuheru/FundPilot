import { useCallback, useEffect, useState } from 'react'

/** TA runs on a separate origin; refetch on focus and while visible instead of relying on same-origin events. */
export default function useSettlementRefresh() {
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(r => r + 1), [])
  useEffect(() => {
    const visible = () => { if (document.visibilityState === 'visible') reload() }
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', visible)
    const timer = window.setInterval(visible, 30000)
    return () => { window.removeEventListener('focus', reload); document.removeEventListener('visibilitychange', visible); window.clearInterval(timer) }
  }, [reload])
  return { revision, reload }
}
