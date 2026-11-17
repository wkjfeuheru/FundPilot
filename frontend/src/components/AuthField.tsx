import { useId, useState } from 'react'
interface AuthFieldProps {
  label: string; value: string; onChange: (value: string) => void
  error?: string; password?: boolean; autoComplete?: string; disabled?: boolean
}
export default function AuthField({ label, value, onChange, error, password = false, autoComplete, disabled }: AuthFieldProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return <div className={`field${error ? ' invalid' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className={`input-wrap${password ? ' with-action' : ''}`}>
      <input id={id} type={password && !visible ? 'password' : 'text'} value={value} onChange={event => onChange(event.target.value)}
        autoComplete={autoComplete} maxLength={64} disabled={disabled} required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      {password && <button className="input-action" type="button" onClick={() => setVisible(!visible)}
        aria-label={`${visible ? '隐藏' : '显示'}${label}`} aria-pressed={visible}>{visible ? '隐藏' : '显示'}</button>}
    </div>
    {error && <div className="auth-error" id={`${id}-error`}>{error}</div>}
  </div>
}
