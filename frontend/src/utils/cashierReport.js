import { formatRupiah } from './format'
import { formatReportDate, formatReportDateTime, rupiahPlain } from './salesReport'

export { formatReportDate, formatReportDateTime, rupiahPlain }

export function shiftStatusLabel(status) {
  if (status === 'open') return 'Shift aktif'
  if (status === 'closed') return 'Shift tertutup'
  return 'Semua shift'
}

export function formatCashierFilterSummary(filters, formData) {
  const parts = []

  if (filters.userId && formData?.users) {
    const user = formData.users.find((u) => String(u.id) === String(filters.userId))
    if (user) parts.push(`Kasir: ${user.fullName}`)
  }

  if (filters.shiftStatus) {
    parts.push(`Status: ${shiftStatusLabel(filters.shiftStatus)}`)
  }

  return parts.length ? parts.join(' · ') : 'Semua kasir & shift'
}

export function computeCashierReportSummary(report) {
  const shifts = report?.shifts ?? []
  let transactionCount = 0
  let totalSales = 0
  let cashSales = 0
  let nonCashSales = 0
  let openingCashTotal = 0
  let closingCashTotal = 0
  let varianceTotal = 0
  let varianceCount = 0

  for (const s of shifts) {
    transactionCount += s.transactionCount ?? 0
    totalSales += s.totalSales ?? 0
    cashSales += s.cashSales ?? 0
    nonCashSales += s.nonCashSales ?? 0
    if (s.openingCash != null) openingCashTotal += s.openingCash
    if (s.closingCash != null) closingCashTotal += s.closingCash
    if (s.cashVariance != null) {
      varianceTotal += s.cashVariance
      varianceCount += 1
    }
  }

  return {
    shiftCount: shifts.length,
    openShiftCount: report?.openShiftCount ?? shifts.filter((s) => s.isOpen).length,
    transactionCount,
    totalSales,
    cashSales,
    nonCashSales,
    openingCashTotal,
    closingCashTotal,
    varianceTotal,
    varianceCount,
  }
}

export function formatVariance(amount) {
  if (amount == null) return '-'
  const formatted = formatRupiah(Math.abs(amount))
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}
