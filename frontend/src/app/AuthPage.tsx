import { Link, useLocation } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'
import useAuthForm from '../hooks/useAuthForm'
import AuthField from '../components/AuthField'
import type { ShellMode } from './pages'
import AuthShell from './AuthShell'
interface AuthPageProps { mode: ShellMode }
export default function AuthPage({ mode }: AuthPageProps) {
  usePageTitle(mode === 'advisor' ? 'FA 端登录' : '登录')
  const { form, setField, errors, message, pending, submit } = useAuthForm(mode, 'login')
  const location = useLocation()
  return <AuthShell mode={mode}>
    <h1 className="auth-title">欢迎回来</h1>
    <p className="auth-sub">{mode === 'advisor' ? '登录 FundPilot PRO，进入投顾工作台。' : '登录 FundPilot，进入你的财富管理空间。'}</p>
    <form className="auth-form" noValidate onSubmit={event => { event.preventDefault(); void submit() }} aria-busy={pending}>
      {message && <p className="auth-form-alert" role="alert">{message}</p>}
      <AuthField label="用户名" value={form.username} onChange={value => setField('username', value)} error={errors.username} autoComplete="username" disabled={pending} />
      <AuthField label="密码" value={form.password} onChange={value => setField('password', value)} error={errors.password} autoComplete="current-password" password disabled={pending} />
      <p className="field-hint">密码为 8–64 位。请使用{mode === 'advisor' ? '投顾' : '投资者'}账号登录本端。</p>
      <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>{pending ? '登录中…' : '登录'}</button>
    </form>
    <div className="auth-foot">
      <div className="auth-switch">还没有账号？<Link to={`/register${location.search}`}>立即注册</Link></div>
      <p className="auth-legal">登录状态在会话有效期内保留。演示环境 · 非真实交易。</p>
    </div>
  </AuthShell>
}
