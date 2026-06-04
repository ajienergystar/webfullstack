import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import DashboardHome from './pages/dashboard/DashboardHome'
import SalesPenjualan from './pages/dashboard/SalesPenjualan'
import SalesRiwayat from './pages/dashboard/SalesRiwayat'
import SalesHold from './pages/dashboard/SalesHold'
import SalesRefund from './pages/dashboard/SalesRefund'
import Users from './pages/dashboard/Users'
import PagePlaceholder from './pages/dashboard/PagePlaceholder'
import { posMenu } from './config/posMenu'
import './index.css'

function collectChildRoutes() {
  const routes = []
  posMenu.forEach((item) => {
    if (item.children) {
      item.children.forEach((child) => routes.push(child.path))
    }
  })
  return routes
}

const childPaths = collectChildRoutes()

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/signin" replace />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/home"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/pos/penjualan" element={<SalesPenjualan />} />
          <Route path="/dashboard/pos/riwayat" element={<SalesRiwayat />} />
          <Route path="/dashboard/pos/hold" element={<SalesHold />} />
          <Route path="/dashboard/pos/refund" element={<SalesRefund />} />
          <Route path="/dashboard/users" element={<Users />} />
          {childPaths.filter((path) => !['/dashboard/pos/penjualan', '/dashboard/pos/riwayat', '/dashboard/pos/hold', '/dashboard/pos/refund', '/dashboard/users'].includes(path)).map((path) => (
            <Route key={path} path={path} element={<PagePlaceholder />} />
          ))}
          <Route path="/dashboard/notifikasi" element={<PagePlaceholder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
