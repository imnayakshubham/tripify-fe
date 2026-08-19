import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminRoute } from '@/routes/AdminRoute'
import { AppLayout } from '@/routes/AppLayout'
import { PlanRoute } from '@/routes/PlanRoute'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<PlanRoute />} />
        <Route path="/conv/:planId" element={<PlanRoute />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
