import { formatRupiah } from './format'
import { computeSalesReportSummary } from './salesReport'

export { formatReportDate, formatReportDateTime, rupiahPlain } from './salesReport'

export function toIsoDateStart(dateStr) {
  if (!dateStr) return undefined
  return new Date(`${dateStr}T00:00:00`).toISOString()
}

export function toIsoDateEnd(dateStr) {
  if (!dateStr) return undefined
  return new Date(`${dateStr}T23:59:59.999`).toISOString()
}

export function filterRefundsInRange(refunds, dateFrom, dateTo) {
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
  const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null
  return (refunds ?? []).filter((r) => {
    const d = new Date(r.refundDate)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })
}

export function computeCashSummary(transactions = []) {
  let cashIn = 0
  let cashOut = 0
  for (const tx of transactions) {
    const amount = tx.amount ?? 0
    if (tx.transactionType === 'IN') cashIn += amount
    else if (tx.transactionType === 'OUT') cashOut += amount
  }
  return {
    count: transactions.length,
    cashIn,
    cashOut,
    netFlow: cashIn - cashOut,
  }
}

export function computeFinanceSummary({
  salesHistory,
  refunds,
  purchases,
  expenses,
  cashTransactions,
}) {
  const sales = computeSalesReportSummary(salesHistory?.transactions ?? [])
  const refundTotal = refunds.reduce((s, r) => s + (r.totalRefund ?? 0), 0)
  const purchaseTotal = purchases?.totalAmount ?? 0
  const expenseTotal = expenses?.totalAmount ?? 0
  const cash = computeCashSummary(cashTransactions?.transactions ?? [])

  const grossRevenue = sales.grandTotal
  const netRevenue = grossRevenue - refundTotal
  const totalExpenses = purchaseTotal + expenseTotal
  const operatingProfit = netRevenue - totalExpenses

  return {
    sales,
    refunds: {
      count: refunds.length,
      total: refundTotal,
    },
    purchases: {
      count: purchases?.totalCount ?? purchases?.purchases?.length ?? 0,
      total: purchaseTotal,
    },
    expenses: {
      count: expenses?.totalCount ?? expenses?.expenses?.length ?? 0,
      total: expenseTotal,
    },
    cash,
    grossRevenue,
    netRevenue,
    totalExpenses,
    operatingProfit,
  }
}

export function incomeStatementRows(summary) {
  return [
    { label: 'Subtotal Penjualan', amount: summary.sales.subTotal, type: 'normal' },
    { label: 'Diskon Penjualan', amount: -(summary.sales.discount), type: 'deduction' },
    { label: 'Pajak Terkutip (Tax)', amount: summary.sales.tax, type: 'normal' },
    { label: 'Total Penjualan (GrandTotal)', amount: summary.grossRevenue, type: 'subtotal' },
    { label: 'Retur / Refund Penjualan', amount: -summary.refunds.total, type: 'deduction' },
    { label: 'Pendapatan Bersih', amount: summary.netRevenue, type: 'highlight' },
    { label: 'Pembelian Barang (Purchases)', amount: -summary.purchases.total, type: 'deduction' },
    { label: 'Pengeluaran Operasional (Expenses)', amount: -summary.expenses.total, type: 'deduction' },
    { label: 'Total Beban', amount: -summary.totalExpenses, type: 'subtotal' },
    { label: 'Laba / Rugi Operasional', amount: summary.operatingProfit, type: 'result' },
  ]
}

export function formatFinanceFilterSummary({ outletId }, formData) {
  if (outletId && formData?.outlets) {
    const outlet = formData.outlets.find((o) => String(o.id) === String(outletId))
    if (outlet) return `Outlet: ${outlet.outletName}`
  }
  return 'Semua outlet'
}

export function amountClass(amount) {
  if (amount > 0) return 'report-amount-positive'
  if (amount < 0) return 'report-amount-negative'
  return ''
}

export function formatSignedRupiah(amount) {
  const abs = formatRupiah(Math.abs(amount))
  if (amount < 0) return `(${abs})`
  return abs
}
