import { formatRupiah } from './format'
import { formatReportDateTime } from './salesReport'

export const LOW_STOCK_THRESHOLD = 5

export function computeProductReportSummary(products = []) {
  let totalStock = 0
  let purchaseValue = 0
  let sellingValue = 0
  let activeCount = 0
  let inactiveCount = 0
  let lowStockCount = 0

  for (const p of products) {
    totalStock += p.stock ?? 0
    purchaseValue += (p.purchasePrice ?? 0) * (p.stock ?? 0)
    sellingValue += (p.sellingPrice ?? 0) * (p.stock ?? 0)
    if (p.isActive) activeCount += 1
    else inactiveCount += 1
    if ((p.stock ?? 0) <= LOW_STOCK_THRESHOLD) lowStockCount += 1
  }

  return {
    count: products.length,
    activeCount,
    inactiveCount,
    totalStock,
    purchaseValue,
    sellingValue,
    lowStockCount,
  }
}

export function computeCategoryBreakdown(products = []) {
  const map = new Map()

  for (const p of products) {
    const category = p.categoryName || 'Tanpa Kategori'
    const cur = map.get(category) ?? {
      count: 0,
      stock: 0,
      purchaseValue: 0,
      sellingValue: 0,
    }
    map.set(category, {
      count: cur.count + 1,
      stock: cur.stock + (p.stock ?? 0),
      purchaseValue: cur.purchaseValue + (p.purchasePrice ?? 0) * (p.stock ?? 0),
      sellingValue: cur.sellingValue + (p.sellingPrice ?? 0) * (p.stock ?? 0),
    })
  }

  return [...map.entries()]
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.count - a.count)
}

export function formatProductFilterSummary(filters, formData) {
  const parts = []

  if (filters.search?.trim()) parts.push(`Pencarian: "${filters.search.trim()}"`)
  if (filters.categoryId && formData?.categories) {
    const cat = formData.categories.find((c) => String(c.id) === String(filters.categoryId))
    if (cat) parts.push(`Kategori: ${cat.categoryName}`)
  }
  if (filters.activeFilter === 'active') parts.push('Status: Aktif')
  if (filters.activeFilter === 'inactive') parts.push('Status: Nonaktif')

  return parts.length ? parts.join(' · ') : 'Semua produk'
}

export function productStatusLabel(isActive) {
  return isActive ? 'Aktif' : 'Nonaktif'
}

export { formatReportDateTime, formatRupiah }

export function rupiahPlain(amount) {
  return formatRupiah(amount).replace(/\u00a0/g, ' ')
}
