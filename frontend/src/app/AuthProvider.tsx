import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useStore } from 'zustand'
import { createAuthStore } from '../stores/auth'
import type { AuthState } from '../stores/auth'
import { subscribeAuthInvalidation } from '../api/http'

const AuthContext = createContext<ReturnType<typeof createAuthStore> | null>(null)
interface AuthProviderProps { children: ReactNode }
export default function AuthProvider({ children }: AuthProviderProps) {
  const [store] = useState(createAuthStore)
  useEffect(() => {
    const unsubscribe = subscribeAuthInvalidation(store.getState().invalidate)
    const restore = () => { void store.getState().restore() }
    const visible = () => { if (document.visibilityState === 'visible') restore() }
    restore()
    window.addEventListener('focus', restore)
    document.addEventListener('visibilitychange', visible)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', restore)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [store])
  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>
}
export function useAuth<T>(selector: (state: AuthState) => T): T {
  const store = useContext(AuthContext)
  if (!store) throw new Error('认证组件必须在 AuthProvider 内使用')
  return useStore(store, selector)
}
