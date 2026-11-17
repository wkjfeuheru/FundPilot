import type { ShellMode } from './pages'
export function safeReturnTo(value: string | null, mode: ShellMode): string {
  const fallback = `/${mode}/overview`
  if (!value || !value.startsWith(`/${mode}/`) || /[\\\\\u0000-\u0020]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://fundpilot.invalid')
    return url.origin === 'https://fundpilot.invalid' && url.pathname.startsWith(`/${mode}/`) ? url.pathname + url.search + url.hash : fallback
  } catch { return fallback }
}
