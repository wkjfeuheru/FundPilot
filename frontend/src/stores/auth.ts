import { createStore } from 'zustand/vanilla'
import { ApiError, setCsrfToken } from '../api/http'
import { createSession, deleteSession, getCurrentUser } from '../api/endpoints/auth'
import type { LoginInput, UserProfile } from '../api/endpoints/auth'
export interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous' | 'error'
  user: UserProfile | null
  message: string
  restore: () => Promise<void>
  signIn: (input: LoginInput) => Promise<UserProfile>
  signOut: () => Promise<void>
  invalidate: (error: ApiError) => void
}
export function createAuthStore() {
  let generation = 0
  let pending: Promise<void> | null = null
  return createStore<AuthState>((set) => ({
    status: 'loading', user: null, message: '',
    restore: () => {
      if (pending) return pending
      const current = ++generation
      const task = getCurrentUser().then(user => {
        if (current === generation) {
          // Another port may have replaced the session cookie; never retain its old CSRF token.
          setCsrfToken(null)
          set({ status: 'authenticated', user, message: '' })
        }
      }).catch((error: unknown) => {
        if (current !== generation) return
        if (error instanceof ApiError && (error.status === 401 || error.code === 'AUTH_ACCOUNT_DISABLED')) {
          set({ status: 'anonymous', user: null, message: error.code === 'AUTH_UNAUTHENTICATED' ? '' : error.message })
        } else {
          set({ status: 'error', user: null, message: error instanceof Error ? error.message : '会话恢复失败，请重试' })
        }
      }).finally(() => { if (pending === task) pending = null })
      pending = task
      return task
    },
    signIn: async input => {
      ++generation
      const user = await createSession(input)
      ++generation
      set({ status: 'authenticated', user, message: '' })
      return user
    },
    signOut: async () => {
      await deleteSession()
      ++generation
      set({ status: 'anonymous', user: null, message: '' })
    },
    invalidate: error => {
      ++generation
      set({ status: 'anonymous', user: null, message: error.code === 'AUTH_UNAUTHENTICATED' ? '' : error.message })
    },
  }))
}
