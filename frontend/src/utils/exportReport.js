import { salesApi } from '../api/sales'
import { productsApi } from '../api/products'
import { stockApi } from '../api/stock'
import { shiftsApi } from '../api/shifts'
import { expensesApi } from '../api/expenses'
import { purchasesApi } from '../api/purchases'
import { cashBankApi } from '../api/cashBank'
import { refundApi } from '../api/refund'
import { computeSalesReportSummary, computePaymentBreakdown } from './salesReport'
import { computeProductReportSummary } from './productReport'
import {
  computeFinanceSummary,
  filterRefundsInRange,
  incomeStatementRows,
  toIsoDateEnd,
  toIsoDateStart,
} from './financeReport'
import {
  computeInventorySummary,
  mergeStockWithPrices,
} from './inventoryReport'
import { computeCashierReportSummary } from './cashierReport'
import { formatReportDate, formatReportDateTime } from './salesReport'

export { formatReportDate, formatReportDateTime }

export const DEFAULT_EXPORT_MODULES = {
  penjualan: true,
  produk: true,
  keuangan: true,
  inventory: true,
  kasir: true,
}

export const EXPORT_MODULE_OPTIONS = [
  { id: 'penjualan', label: 'Penjualan', source: 'SalesTransactions' },
  { id: 'produk', label: 'Produk', source: 'Products, ProductCategories' },
  { id: 'keuangan', label: 'Keuangan', source: 'Sales, Refunds, Purchases, Expenses, CashTransactions' },
  { id: 'inventory', label: 'Inventory', source: 'Products, StockMovements' },
  { id: 'kasir', label: 'Kasir', source: 'CashierShifts, SalesTransactions' },
]

export function formatExportFilterSummary({ outletId }, formData) {
  if (outletId && formData?.outlets) {
    const outlet = formData.outlets.find((o) => String(o.id) === String(outletId))
    if (outlet) return `Outlet: ${outlet.outletName}`
  }
  return 'Semua outlet'
}

export function formatModulesSummary(modules) {
  if (!modules) return 'Tidak ada modul dipilih'
  const labels = EXPORT_MODULE_OPTIONS
    .filter((m) => modules[m.id])
    .map((m) => m.label)
  return labels.length ? labels.join(', ') : 'Tidak ada modul dipilih'
}

export async function fetchExportReportData(filters, modules = DEFAULT_EXPORT_MODULES) {
  const mod = modules ?? DEFAULT_EXPORT_MODULES
  const { dateFrom, dateTo, outletId } = filters
  const dateFromIso = toIsoDateStart(dateFrom)
  const dateToIso = toIsoDateEnd(dateTo)
  const outletParam = outletId || undefined

  const needsSales = mod.penjualan || mod.keuangan
  const tasks = []

  if (needsSales) {
    tasks.push(
      salesApi
        .getHistory({ dateFrom, dateTo, outletId: outletParam })
        .then((salesHistory) => ({ salesHistory })),
    )
  }

  if (mod.keuangan) {
    tasks.push(
      Promise.all([
        expensesApi.list({ dateFrom: dateFromIso, dateTo: dateToIso }),
        purchasesApi.list({ dateFrom: dateFromIso, dateTo: dateToIso }),
        cashBankApi.listTransactions({ dateFrom: dateFromIso, dateTo: dateToIso }),
        refundApi.list(),
      ]).then(([expenses, purchases, cashTransactions, refundList]) => {
        const refunds = filterRefundsInRange(refundList.refunds, dateFrom, dateTo)
        return { expenses, purchases, cashTransactions, refunds }
      }),
    )
  }

  if (mod.produk) {
    tasks.push(productsApi.list({}).then((listData) => ({ listData })))
  }

  if (mod.inventory) {
    tasks.push(
      Promise.all([stockApi.overview({}), productsApi.list({})]).then(([overview, priced]) => ({
        overview,
        priceProducts: priced.products ?? [],
      })),
    )
  }

  if (mod.kasir) {
    tasks.push(
      shiftsApi
        .getReport({ dateFrom, dateTo })
        .then((cashierReport) => ({ cashierReport })),
    )
  }

  const chunks = await Promise.all(tasks)
  const raw = Object.assign({}, ...chunks)

  return buildExportSnapshot(raw, mod)
}

export function buildExportSnapshot(raw, modules = DEFAULT_EXPORT_MODULES) {
  const mod = modules ?? DEFAULT_EXPORT_MODULES
  const snapshot = { modules: { ...mod } }

  if (mod.penjualan && raw.salesHistory) {
    const transactions = raw.salesHistory.transactions ?? []
    snapshot.penjualan = {
      summary: computeSalesReportSummary(transactions),
      payments: computePaymentBreakdown(transactions),
      transactions: transactions.slice(0, 50),
      totalFromApi: raw.salesHistory.totalGrandTotal,
    }
  }

  if (mod.produk && raw.listData) {
    const products = raw.listData.products ?? []
    snapshot.produk = {
      summary: computeProductReportSummary(products),
      lowStock: products
        .filter((p) => (p.stock ?? 0) <= 5)
        .slice(0, 15),
    }
  }

  if (mod.keuangan && raw.salesHistory) {
    const financeSummary = computeFinanceSummary({
      salesHistory: raw.salesHistory,
      refunds: raw.refunds ?? [],
      purchases: raw.purchases,
      expenses: raw.expenses,
      cashTransactions: raw.cashTransactions,
    })
    snapshot.keuangan = {
      summary: financeSummary,
      incomeRows: incomeStatementRows(financeSummary),
    }
  }

  if (mod.inventory && raw.overview) {
    const enriched = mergeStockWithPrices(
      raw.overview.products ?? [],
      raw.priceProducts ?? [],
    )
    snapshot.inventory = {
      summary: computeInventorySummary(enriched),
      lowStock: enriched
        .filter((p) => (p.stock ?? 0) <= 5)
        .slice(0, 15),
    }
  }

  if (mod.kasir && raw.cashierReport) {
    snapshot.kasir = {
      summary: computeCashierReportSummary(raw.cashierReport),
      shifts: (raw.cashierReport.shifts ?? []).slice(0, 20),
      payments: raw.cashierReport.paymentBreakdown ?? [],
    }
  }

  return snapshot
}

export function exportHasData(snapshot) {
  if (!snapshot) return false
  if (snapshot.penjualan?.summary?.count > 0) return true
  if (snapshot.produk?.summary?.count > 0) return true
  if (snapshot.keuangan?.summary) {
    const s = snapshot.keuangan.summary
    if (
      s.sales.count > 0
      || s.refunds.count > 0
      || s.purchases.count > 0
      || s.expenses.count > 0
      || s.cash.count > 0
    ) {
      return true
    }
  }
  if (snapshot.inventory?.summary?.count > 0) return true
  if (snapshot.kasir?.summary?.shiftCount > 0) return true
  return false
}

export function executiveSummaryRows(snapshot) {
  const rows = []
  if (!snapshot) return rows

  if (snapshot.penjualan) {
    const s = snapshot.penjualan.summary
    rows.push({
      modul: 'Penjualan',
      indikator: 'Total Penjualan (GrandTotal)',
      nilai: s.grandTotal,
      satuan: `${s.count} transaksi`,
    })
  }

  if (snapshot.keuangan) {
    const s = snapshot.keuangan.summary
    rows.push({
      modul: 'Keuangan',
      indikator: 'Pendapatan Bersih',
      nilai: s.netRevenue,
      satuan: `setelah ${s.refunds.count} refund`,
    })
    rows.push({
      modul: 'Keuangan',
      indikator: 'Laba / Rugi Operasional',
      nilai: s.operatingProfit,
      satuan: 'penjualan − beban',
    })
  }

  if (snapshot.produk) {
    const s = snapshot.produk.summary
    rows.push({
      modul: 'Produk',
      indikator: 'Nilai Stok (Harga Jual)',
      nilai: s.sellingValue,
      satuan: `${s.count} SKU · stok ${s.totalStock}`,
    })
  }

  if (snapshot.inventory) {
    const s = snapshot.inventory.summary
    rows.push({
      modul: 'Inventory',
      indikator: 'Nilai Persediaan',
      nilai: s.sellingValue,
      satuan: `${s.lowStockCount} item stok rendah`,
    })
  }

  if (snapshot.kasir) {
    const s = snapshot.kasir.summary
    rows.push({
      modul: 'Kasir',
      indikator: 'Penjualan per Shift',
      nilai: s.totalSales,
      satuan: `${s.shiftCount} shift · ${s.transactionCount} trx`,
    })
  }

  return rows
}
