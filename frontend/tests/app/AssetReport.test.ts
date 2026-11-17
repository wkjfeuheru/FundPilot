import { afterEach, expect, it, vi } from 'vitest'
import { getAssetReport } from '../../src/api/endpoints/assets'
import { setCsrfToken, subscribeAuthInvalidation } from '../../src/api/http'
afterEach(() => { vi.unstubAllGlobals(); setCsrfToken(null) })
it('downloads the binary PDF and the server filename through the session client', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="FundPilot-asset-report-20261117.pdf"' } })))
  const report = await getAssetReport()
  expect(report.filename).toBe('FundPilot-asset-report-20261117.pdf')
  expect(report.blob.size).toBe(8)
  expect(report.blob.type).toBe('application/pdf')
  expect(fetch).toHaveBeenCalledWith('/api/v1/asset-overviews/current/report', expect.objectContaining({ credentials: 'same-origin', method: 'GET' }))
})
it('invalidates an expired session instead of downloading an error as a PDF', async () => {
  const invalidated = vi.fn(), unsubscribe = subscribeAuthInvalidation(invalidated)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 'AUTH_SESSION_EXPIRED', detail: '登录已过期' }), { status: 401 })))
  try { await expect(getAssetReport()).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' }); expect(invalidated).toHaveBeenCalledTimes(1) }
  finally { unsubscribe() }
})
it('rejects a successful response with the wrong media type', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } })))
  await expect(getAssetReport()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
})
