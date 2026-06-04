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
import MasterProduk from './pages/dashboard/MasterProduk'
import MasterKategori from './pages/dashboard/MasterKategori'
import MasterBrand from './pages/dashboard/MasterBrand'
import MasterSupplier from './pages/dashboard/MasterSupplier'
import MasterStok from './pages/dashboard/MasterStok'
import KasBank from './pages/dashboard/KasBank'
import Pengeluaran from './pages/dashboard/Pengeluaran'
import HutangPiutang from './pages/dashboard/HutangPiutang'
import Pajak from './pages/dashboard/Pajak'
import CustomerData from './pages/dashboard/CustomerData'
import CustomerMembership from './pages/dashboard/CustomerMembership'
import CustomerLoyalty from './pages/dashboard/CustomerLoyalty'
import CustomerHutang from './pages/dashboard/CustomerHutang'
import Users from './pages/dashboard/Users'
import Roles from './pages/dashboard/Roles'
import ShiftKasir from './pages/dashboard/ShiftKasir'
import Attendance from './pages/dashboard/Attendance'
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
          <Route path="/dashboard/master/produk" element={<MasterProduk />} />
          <Route path="/dashboard/master/kategori" element={<MasterKategori />} />
          <Route path="/dashboard/master/brand" element={<MasterBrand />} />
          <Route path="/dashboard/master/supplier" element={<MasterSupplier />} />
          <Route path="/dashboard/master/stok" element={<MasterStok />} />
          <Route path="/dashboard/finance/kas" element={<KasBank />} />
          <Route path="/dashboard/finance/pengeluaran" element={<Pengeluaran />} />
          <Route path="/dashboard/finance/hutang" element={<HutangPiutang />} />
          <Route path="/dashboard/finance/pajak" element={<Pajak />} />
          {childPaths
            .filter(
              (path) =>
                ![
                  '/dashboard/pos/penjualan',
                  '/dashboard/pos/riwayat',
                  '/dashboard/pos/hold',
                  '/dashboard/pos/refund',
                  '/dashboard/master/produk',
                  '/dashboard/master/kategori',
                  '/dashboard/master/brand',
                  '/dashboard/master/supplier',
                  '/dashboard/master/stok',
                  '/dashboard/finance/kas',
                  '/dashboard/finance/pengeluaran',
                  '/dashboard/finance/hutang',
                  '/dashboard/finance/pajak',
                ].includes(path),
            )
            .map((path) => (
              <Route key={path} path={path} element={<PagePlaceholder />} />
            ))}
          <Route path="/dashboard/customer/data" element={<CustomerData />} />
          <Route path="/dashboard/customer/membership" element={<CustomerMembership />} />
          <Route path="/dashboard/customer/loyalty" element={<CustomerLoyalty />} />
          <Route path="/dashboard/customer/hutang" element={<CustomerHutang />} />
          {childPaths.filter((path) => !['/dashboard/pos/penjualan', '/dashboard/pos/riwayat', '/dashboard/pos/hold', '/dashboard/pos/refund', '/dashboard/customer/data', '/dashboard/customer/membership', '/dashboard/customer/loyalty', '/dashboard/customer/hutang'].includes(path)).map((path) => (
          <Route path="/dashboard/users" element={<Users />} />
          <Route path="/dashboard/users/roles" element={<Roles />} />
          <Route path="/dashboard/users/shift" element={<ShiftKasir />} />
          <Route path="/dashboard/users/attendance" element={<Attendance />} />
          {childPaths.filter((path) => !['/dashboard/pos/penjualan', '/dashboard/pos/riwayat', '/dashboard/pos/hold', '/dashboard/pos/refund', '/dashboard/users', '/dashboard/users/roles', '/dashboard/users/shift', '/dashboard/users/attendance'].includes(path)).map((path) => (
            <Route key={path} path={path} element={<PagePlaceholder />} />
          ))}
          <Route path="/dashboard/notifikasi" element={<PagePlaceholder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
