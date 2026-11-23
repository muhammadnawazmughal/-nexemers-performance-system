import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import { useAuth } from './context/AuthContext'

const Login = lazy(() => import('./pages/auth/Login'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Employees = lazy(() => import('./pages/admin/Employees'))
const Teams = lazy(() => import('./pages/admin/Teams'))
const DailyRecords = lazy(() => import('./pages/records/DailyRecords'))
const SalesRecords = lazy(() => import('./pages/records/SalesRecords'))
const Reports = lazy(() => import('./pages/reports/Reports'))
const Attendance = lazy(() => import('./pages/attendance/Attendance'))
const DataManagement = lazy(() => import('./pages/data/DataManagement'))
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'))
const Settings = lazy(() => import('./pages/settings/Settings'))
const MyPerformance = lazy(() => import('./pages/employees/MyPerformance'))

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'employee' ? '/my-performance' : user?.role === 'supervisor' ? '/records/daily' : '/admin/dashboard'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Suspense fallback={<div className="grid min-h-screen place-items-center text-slate-500">Loading...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/employees" element={<Employees />} />
            <Route path="/admin/teams" element={<Teams />} />
            <Route path="/admin/supervisors" element={<Teams />} />
            <Route path="/records/daily" element={<DailyRecords />} />
            <Route path="/records/sales" element={<SalesRecords />} />
            <Route path="/reports/daily" element={<Reports />} />
            <Route path="/reports/weekly" element={<Reports />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/data-management" element={<DataManagement />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-performance" element={<MyPerformance />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
