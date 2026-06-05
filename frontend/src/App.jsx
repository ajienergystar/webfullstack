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
import LaporanPenjualan from './pages/dashboard/LaporanPenjualan'
import LaporanProduk from './pages/dashboard/LaporanProduk'
import LaporanKeuangan from './pages/dashboard/LaporanKeuangan'
import LaporanInventory from './pages/dashboard/LaporanInventory'
import LaporanKasir from './pages/dashboard/LaporanKasir'
import LaporanExport from './pages/dashboard/LaporanExport'
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
import PurchaseOrder from './pages/dashboard/PurchaseOrder'
import PenerimaanBarang from './pages/dashboard/PenerimaanBarang'
import ReturPembelian from './pages/dashboard/ReturPembelian'
import PagePlaceholder from './pages/dashboard/PagePlaceholder'
import OutletCabang from './pages/dashboard/OutletCabang'
import TransferStok from './pages/dashboard/TransferStok'
import MonitoringPenjualan from './pages/dashboard/MonitoringPenjualan'
import DiskonProduk from './pages/dashboard/DiskonProduk'
import Voucher from './pages/dashboard/Voucher'
import Bundling from './pages/dashboard/Bundling'
import MembershipLevel from './pages/dashboard/MembershipLevel'
import Notifikasi from './pages/dashboard/Notifikasi'
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
          <Route path="/dashboard/laporan/penjualan" element={<LaporanPenjualan />} />
          <Route path="/dashboard/laporan/produk" element={<LaporanProduk />} />
          <Route path="/dashboard/laporan/keuangan" element={<LaporanKeuangan />} />
          <Route path="/dashboard/laporan/inventory" element={<LaporanInventory />} />
          <Route path="/dashboard/laporan/kasir" element={<LaporanKasir />} />
          <Route path="/dashboard/laporan/export" element={<LaporanExport />} />
          <Route path="/dashboard/master/produk" element={<MasterProduk />} />
          <Route path="/dashboard/master/kategori" element={<MasterKategori />} />
          <Route path="/dashboard/master/brand" element={<MasterBrand />} />
          <Route path="/dashboard/master/supplier" element={<MasterSupplier />} />
          <Route path="/dashboard/master/stok" element={<MasterStok />} />
          <Route path="/dashboard/finance/kas" element={<KasBank />} />
          <Route path="/dashboard/finance/pengeluaran" element={<Pengeluaran />} />
          <Route path="/dashboard/finance/hutang" element={<HutangPiutang />} />
          <Route path="/dashboard/finance/pajak" element={<Pajak />} />
          <Route path="/dashboard/purchase/po" element={<PurchaseOrder />} />
          <Route path="/dashboard/purchase/terima" element={<PenerimaanBarang />} />
          <Route path="/dashboard/purchase/retur" element={<ReturPembelian />} />
          {childPaths
            .filter(
              (path) =>
                ![
                  '/dashboard/pos/penjualan',
                  '/dashboard/pos/riwayat',
                  '/dashboard/pos/hold',
                  '/dashboard/pos/refund',
                  '/dashboard/laporan/penjualan',
                  '/dashboard/laporan/produk',
                  '/dashboard/laporan/keuangan',
                  '/dashboard/laporan/inventory',
                  '/dashboard/laporan/kasir',
                  '/dashboard/laporan/export',
                  '/dashboard/master/produk',
                  '/dashboard/master/kategori',
                  '/dashboard/master/brand',
                  '/dashboard/master/supplier',
                  '/dashboard/master/stok',
                  '/dashboard/finance/kas',
                  '/dashboard/finance/pengeluaran',
                  '/dashboard/finance/hutang',
                  '/dashboard/finance/pajak',
                  '/dashboard/purchase/po',
                  '/dashboard/purchase/terima',
                  '/dashboard/purchase/retur',
                  '/dashboard/customer/data',
                  '/dashboard/customer/membership',
                  '/dashboard/customer/loyalty',
                  '/dashboard/customer/hutang',
                  '/dashboard/users',
                  '/dashboard/users/roles',
                  '/dashboard/users/shift',
                  '/dashboard/users/attendance',
                  '/dashboard/outlet/cabang',
                  '/dashboard/outlet/transfer',
                  '/dashboard/outlet/monitoring',
                  '/dashboard/promo/diskon',
                  '/dashboard/promo/voucher',
                  '/dashboard/promo/bundling',
                  '/dashboard/promo/membership',
                ].includes(path),
            )
            .map((path) => (
              <Route key={path} path={path} element={<PagePlaceholder />} />
            ))}
          <Route path="/dashboard/customer/data" element={<CustomerData />} />
          <Route path="/dashboard/customer/membership" element={<CustomerMembership />} />
          <Route path="/dashboard/customer/loyalty" element={<CustomerLoyalty />} />
          <Route path="/dashboard/customer/hutang" element={<CustomerHutang />} />
          <Route path="/dashboard/users" element={<Users />} />
          <Route path="/dashboard/users/roles" element={<Roles />} />
          <Route path="/dashboard/users/shift" element={<ShiftKasir />} />
          <Route path="/dashboard/users/attendance" element={<Attendance />} />
          <Route path="/dashboard/outlet/cabang" element={<OutletCabang />} />
          <Route path="/dashboard/outlet/transfer" element={<TransferStok />} />
          <Route path="/dashboard/outlet/monitoring" element={<MonitoringPenjualan />} />
          <Route path="/dashboard/promo/diskon" element={<DiskonProduk />} />
          <Route path="/dashboard/promo/voucher" element={<Voucher />} />
          <Route path="/dashboard/promo/bundling" element={<Bundling />} />
          <Route path="/dashboard/promo/membership" element={<MembershipLevel />} />
          <Route path="/dashboard/notifikasi" element={<Notifikasi />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
