import { Link, useLocation } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'
import useAuthForm from '../hooks/useAuthForm'
import AuthField from '../components/AuthField'
import type { ShellMode } from './pages'
import AuthShell from './AuthShell'
interface RegisterPageProps { mode: ShellMode }
export default function RegisterPage({ mode }: RegisterPageProps) {
  usePageTitle(mode === 'advisor' ? 'FA 端注册开户' : '注册开户')
  const { form, setField, errors, message, pending, result, submit } = useAuthForm(mode, 'register')
  const location = useLocation()
  return <AuthShell mode={mode}>
    <h1 className="auth-title">{result ? '注册成功，请登录' : mode === 'advisor' ? '创建投顾账号' : '创建投资者账号'}</h1>
    {result ? <div className="auth-success show" role="status">
      <p>{result.displayName}，账号 {result.username} 已创建。</p>
      {result.customerCode && <p>客户编号：{result.customerCode}</p>}
      {result.initialCash !== null && <p>演示初始现金：¥{result.initialCash.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>}
      <p>{result.role === 'ADVISOR' ? '客户服务范围由机构分配。' : '首次使用请完成风险测评。'}请使用刚创建的账号登录。</p>
      <Link className="btn btn-primary" to={`/login${location.search}`}>前往登录</Link>
    </div> : <>
      <p className="auth-sub">{mode === 'advisor' ? '注册投顾账号，客户与服务权限由机构统一分配。' : '创建投资者账号并开通演示现金账户，注册后需自行登录。'}</p>
      <form className="auth-form" noValidate onSubmit={event => { event.preventDefault(); void submit() }} aria-busy={pending}>
        {message && <p className="auth-form-alert" role="alert">{message}</p>}
        <AuthField label="用户名" value={form.username} onChange={value => setField('username', value)} error={errors.username} autoComplete="username" disabled={pending} />
        <AuthField label="展示姓名" value={form.displayName} onChange={value => setField('displayName', value)} error={errors.displayName} autoComplete="nickname" disabled={pending} />
        <AuthField label="设置密码" value={form.password} onChange={value => setField('password', value)} error={errors.password} autoComplete="new-password" password disabled={pending} />
        <AuthField label="确认密码" value={form.confirm} onChange={value => setField('confirm', value)} error={errors.confirm} autoComplete="new-password" password disabled={pending} />
        <p className="field-hint">用户名与展示姓名为 1–64 位，密码为 8–64 位。</p>
        <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>{pending ? '创建账号中…' : '创建账号'}</button>
      </form>
      <div className="auth-foot"><div className="auth-switch">已有账号？<Link to={`/login${location.search}`}>返回登录</Link></div></div>
    </>}
    <p className="auth-legal">演示环境 · 非真实交易。账号信息将用于本系统登录，密码以安全散列保存。</p>
  </AuthShell>
}
