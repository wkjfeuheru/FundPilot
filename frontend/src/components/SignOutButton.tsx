import { useState } from 'react'
import { useAuth } from '../app/AuthProvider'
interface SignOutButtonProps { label?: string }
export default function SignOutButton({ label = '退出登录' }: SignOutButtonProps) {
  const signOut = useAuth(state => state.signOut)
  const [status, setStatus] = useState<'idle' | 'pending'>('idle')
  const [error, setError] = useState('')
  async function handleSignOut() {
    if (status === 'pending') return
    setStatus('pending')
    setError('')
    try { await signOut() } catch (cause) { setError(cause instanceof Error ? cause.message : '退出失败，请重试') }
    finally { setStatus('idle') }
  }
  return <div><button type="button" className="btn btn-outline" onClick={() => void handleSignOut()} disabled={status === 'pending'}>{status === 'pending' ? '正在退出…' : label}</button>{error && <p role="alert">{error}</p>}</div>
}
