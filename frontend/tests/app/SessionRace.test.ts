import { afterEach, expect, it, vi } from 'vitest'
import { setCsrfToken, subscribeAuthInvalidation } from '../../src/api/http'
import { createAuthStore } from '../../src/stores/auth'
import { sessionUser } from '../authFixtures'
afterEach(() => vi.unstubAllGlobals())
it('does not let an old anonymous request invalidate a newly established session', async () => {
  setCsrfToken(null)
  let resolveOld: (value: Response) => void = () => { throw new Error('request not started') }
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/sessions')) return new Response(JSON.stringify({ code: 0, data: { user: sessionUser(), csrfToken: 'new-token', csrfHeaderName: 'X-CSRF-Token' } }), { status: 200 })
    return new Promise<Response>(resolve => { resolveOld = resolve })
  }))
  const store = createAuthStore()
  const unsubscribe = subscribeAuthInvalidation(store.getState().invalidate)
  try {
    const old = store.getState().restore()
    await store.getState().signIn({ username: 'layout-user', password: 'Password123' })
    resolveOld(new Response(JSON.stringify({ code: 'AUTH_UNAUTHENTICATED', detail: '请先登录' }), { status: 401 }))
    await old
    expect(store.getState().status).toBe('authenticated')
    expect(store.getState().user?.username).toBe('layout-user')
  } finally { unsubscribe() }
})

it('ignores a restore response that started during a pending login', async () => {
  setCsrfToken(null)
  let resolveLogin: (value: Response) => void = () => { throw new Error('login not started') }
  let resolveMe: (value: Response) => void = () => { throw new Error('restore not started') }
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => new Promise<Response>(resolve => {
    if (String(input).endsWith('/sessions')) resolveLogin = resolve
    else resolveMe = resolve
  })))
  const store = createAuthStore()
  const login = store.getState().signIn({ username: 'layout-user', password: 'Password123' })
  const restore = store.getState().restore()
  resolveLogin(new Response(JSON.stringify({ code: 0, data: { user: sessionUser(), csrfToken: 'new-token', csrfHeaderName: 'X-CSRF-Token' } }), { status: 200 }))
  await login
  resolveMe(new Response(JSON.stringify({ code: 0, data: { ...sessionUser('ADVISOR'), username: 'previous-user' } }), { status: 200 }))
  await restore
  expect(store.getState().user?.username).toBe('layout-user')
})

it('refreshes the CSRF token after restoring a session changed by another site', async () => {
  const store = createAuthStore()
  setCsrfToken('old-token')
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    if (String(input).endsWith('/me')) return new Response(JSON.stringify({ code: 0, data: sessionUser('ADVISOR') }), { status: 200 })
    if (String(input).endsWith('/csrf')) return new Response(JSON.stringify({ code: 0, data: { token: 'current-token', headerName: 'X-CSRF-Token' } }), { status: 200 })
    if (new Headers(options?.headers).get('X-CSRF-Token') !== 'current-token') return new Response(JSON.stringify({ code: 'AUTH_CSRF_INVALID', detail: '令牌失效' }), { status: 403 })
    return new Response(null, { status: 204 })
  }))
  await store.getState().restore()
  await expect(store.getState().signOut()).resolves.toBeUndefined()
  expect(store.getState().status).toBe('anonymous')
})
