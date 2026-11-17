import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import StandaloneLayout from '../../layouts/StandaloneLayout'
import TaPage from '../../modes/ta/TaPage'
import NotFoundPage from '../NotFoundPage'

/** TA 演示台站点（:5175）：无登录、无产品壳层（NFR-M1） */
export default function TaApp() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<StandaloneLayout />}>
          <Route index element={<Navigate to="/ta" replace />} />
          <Route path="/ta" element={<TaPage />} />
          <Route path="/ta/*" element={<NotFoundPage home="/ta" />} />
          <Route path="*" element={<NotFoundPage home="/ta" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
