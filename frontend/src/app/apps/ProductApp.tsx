import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '../../layouts/AppShell'
import AuthPage from '../AuthPage'
import RegisterPage from '../RegisterPage'
import NotFoundPage from '../NotFoundPage'
import AuthProvider from '../AuthProvider'
import AuthGuard from '../AuthGuard'
import { pages } from '../pages'
import type { ShellMode } from '../pages'
interface ProductAppProps { mode: ShellMode }
export default function ProductApp({ mode }: ProductAppProps) {
  return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AuthProvider>
      <Routes>
        <Route element={<AuthGuard mode={mode} publicPage />}>
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<AuthPage mode={mode} />} />
          <Route path="/register" element={<RegisterPage mode={mode} />} />
        </Route>
        <Route element={<AuthGuard mode={mode} />}>
          <Route path={`/${mode}`} element={<AppShell key={mode} mode={mode} />}>
            <Route index element={<Navigate to="overview" replace />} />
            {pages[mode].map(({ path, component: Page }) => <Route key={path} path={path} element={<Page />} />)}
            <Route path="*" element={<NotFoundPage home={`/${mode}/overview`} />} />
          </Route>
          <Route path="*" element={<NotFoundPage home={`/${mode}/overview`} />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>
}
