import { useCallback, useEffect, useRef, useState } from 'react'
import { getAssetReport, getAssetTrend, getOverview } from '../api/endpoints/assets'
import type { NavRange } from '../api/endpoints/funds'
import { errorMessage, useRemote } from './useFunds'
import useSettlementRefresh from './useSettlementRefresh'
export default function useAssetOverview(range: NavRange) {
  const { revision, reload } = useSettlementRefresh()
  const loadTrend = useCallback(() => getAssetTrend(range), [range])
  const overview = useRemote(getOverview, revision), trend = useRemote(loadTrend, revision)
  const [downloading, setDownloading] = useState(false), [downloadError, setDownloadError] = useState('')
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  async function download() {
    if (pending.current) return
    pending.current = true; setDownloading(true); setDownloadError('')
    try {
      const result = await getAssetReport()
      if (!mounted.current) return
      const url = URL.createObjectURL(result.blob)
      const link = document.createElement('a'); link.href = url; link.download = result.filename; document.body.append(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setDownloadError(errorMessage(error)) }
    finally { pending.current = false; setDownloading(false) }
  }
  return { overview, trend, downloading, downloadError, download, reload }
}
