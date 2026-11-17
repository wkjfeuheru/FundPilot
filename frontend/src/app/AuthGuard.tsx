import { useEffect } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { ShellMode } from './pages'
import SignOutButton from '../components/SignOutButton'
import { safeReturnTo } from './authRouting'
import styles from './AuthState.module.css'
interface AuthGuardProps { mode: ShellMode; publicPage?: boolean }
export default function AuthGuard({ mode, publicPage = false }: AuthGuardProps) {
  const status = useAuth(state => state.status)
  const user = useAuth(state => state.user)
  const message = useAuth(state => state.message)
  const restore = useAuth(state => state.restore)
  const location = useLocation()
  useEffect(() => {
    // Each protected navigation rechecks the shared cookie (ports on one host share cookies).
    if (!publicPage) void restore()
  }, [location.pathname, publicPage, restore])
  if (status === 'loading') return <div className={styles.state} role="status">正在恢复登录状态…</div>
  if (status === 'error') return <div className={styles.state}><h1>暂时无法恢复会话</h1><p role="alert">{message}</p><button type="button" onClick={() => void restore()}>重试</button></div>
  if (user && user.role !== mode.toUpperCase()) return <div className={styles.state}>
    <h1>当前账号无法访问{mode === 'advisor' ? 'FA 端' : '用户端'}</h1>
    <p>当前登录的是{user.role === 'ADVISOR' ? '投顾' : '投资者'}账号，请使用本端对应角色的账号登录。</p>
    <SignOutButton label="退出并切换账号" />
  </div>
  if (user && publicPage) return <Navigate to={safeReturnTo(new URLSearchParams(location.search).get('returnTo'), mode)} replace />
  if (!user && !publicPage) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`} replace />
  if (!user && publicPage && location.pathname === '/') return <Navigate to="/login" replace />
  return <><Outlet key={user?.id ?? 'anonymous'} />{publicPage && message && <p className={styles.notice} role="alert">{message}<Link to="/login">返回登录</Link></p>}</>
}
