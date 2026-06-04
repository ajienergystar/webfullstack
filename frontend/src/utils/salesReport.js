import { formatRupiah } from './format'

export function formatReportDate(dateStr) {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatReportDateTime(date = new Date()) {
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function computeSalesReportSummary(transactions = []) {
  let subTotal = 0
  let discount = 0
  let tax = 0
  let grandTotal = 0

  for (const tx of transactions) {
    subTotal += tx.subTotal ?? 0
    discount += tx.discount ?? 0
    tax += tx.tax ?? 0
    grandTotal += tx.grandTotal ?? 0
  }

  return {
    count: transactions.length,
    subTotal,
    discount,
    tax,
    grandTotal,
  }
}

export function computePaymentBreakdown(transactions = []) {
  const map = new Map()

  for (const tx of transactions) {
    const method = tx.paymentMethod || 'Lainnya'
    const cur = map.get(method) ?? { count: 0, total: 0 }
    map.set(method, {
      count: cur.count + 1,
      total: cur.total + (tx.grandTotal ?? 0),
    })
  }

  return [...map.entries()]
    .map(([method, data]) => ({ method, ...data }))
    .sort((a, b) => b.total - a.total)
}

export function formatFilterSummary(filters, formData) {
  const parts = []

  if (filters.outletId && formData?.outlets) {
    const outlet = formData.outlets.find((o) => String(o.id) === String(filters.outletId))
    if (outlet) parts.push(`Outlet: ${outlet.outletName}`)
  }
  if (filters.userId && formData?.users) {
    const user = formData.users.find((u) => String(u.id) === String(filters.userId))
    if (user) parts.push(`Kasir: ${user.fullName}`)
  }
  if (filters.customerId && formData?.customers) {
    const customer = formData.customers.find((c) => String(c.id) === String(filters.customerId))
    if (customer) parts.push(`Pelanggan: ${customer.customerName}`)
  }
  if (filters.paymentMethod) parts.push(`Pembayaran: ${filters.paymentMethod}`)
  if (filters.invoiceNumber) parts.push(`Invoice: ${filters.invoiceNumber}`)

  return parts.length ? parts.join(' · ') : 'Semua transaksi'
}

export function rupiahPlain(amount) {
  return formatRupiah(amount).replace(/\u00a0/g, ' ')
}
