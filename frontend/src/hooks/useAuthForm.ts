import { useState } from 'react'
import { ApiError } from '../api/http'
import { createRegistration } from '../api/endpoints/auth'
import type { RegistrationResult } from '../api/endpoints/auth'
import { useAuth } from '../app/AuthProvider'
import type { ShellMode } from '../app/pages'
export interface AuthFormValues { username: string; password: string; displayName: string; confirm: string }
export type AuthFormErrors = Partial<Record<keyof AuthFormValues, string>>
export default function useAuthForm(mode: ShellMode, kind: 'login' | 'register') {
  const signIn = useAuth(state => state.signIn)
  const [form, setForm] = useState<AuthFormValues>({ username: '', password: '', displayName: '', confirm: '' })
  const [errors, setErrors] = useState<AuthFormErrors>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<RegistrationResult | null>(null)
  function setField(field: keyof AuthFormValues, value: string) {
    setForm(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: undefined }))
  }
  async function submit() {
    if (pending) return
    const next: AuthFormErrors = {}
    const username = form.username.trim()
    if (!username || username.length > 64) next.username = '请输入 1–64 位用户名'
    if (form.password.length < 8 || form.password.length > 64 || !form.password.trim()) next.password = '密码须为 8–64 位'
    if (kind === 'register') {
      if (!form.displayName.trim() || form.displayName.trim().length > 64) next.displayName = '请输入 1–64 位展示姓名'
      if (form.confirm !== form.password) next.confirm = '两次输入的密码不一致'
    }
    setErrors(next)
    setMessage('')
    if (Object.keys(next).length) {
      setMessage('请检查表单中的错误')
      return
    }
    setPending(true)
    try {
      if (kind === 'login') await signIn({ username, password: form.password })
      else {
        const registration = await createRegistration({ username, password: form.password, displayName: form.displayName.trim(), role: mode === 'advisor' ? 'ADVISOR' : 'INVESTOR' })
        setResult(registration)
      }
      setForm(previous => ({ ...previous, password: '', confirm: '' }))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败，请稍后重试')
      if (error instanceof ApiError) {
        const serverErrors: AuthFormErrors = {}
        for (const entry of error.errors) {
          if (entry.field === 'username' || entry.field === 'password' || entry.field === 'displayName') serverErrors[entry.field] = entry.message
        }
        if (error.code === 'AUTH_USERNAME_TAKEN') serverErrors.username = error.message
        setErrors(serverErrors)
      }
    } finally { setPending(false) }
  }
  return { form, setField, errors, message, pending, result, submit }
}
