import { formatRupiah } from './format'
import { formatReportDateTime } from './salesReport'

export const LOW_STOCK_THRESHOLD = 5

export function mergeStockWithPrices(stockProducts = [], priceProducts = []) {
  const priceMap = new Map(priceProducts.map((p) => [p.id, p]))
  return stockProducts.map((s) => {
    const priced = priceMap.get(s.id)
    return {
      ...s,
      purchasePrice: priced?.purchasePrice ?? 0,
      sellingPrice: priced?.sellingPrice ?? 0,
      barcode: priced?.barcode ?? null,
      brandName: priced?.brandName ?? null,
    }
  })
}

export function computeInventorySummary(products = []) {
  let totalStock = 0
  let purchaseValue = 0
  let sellingValue = 0
  let activeCount = 0
  let inactiveCount = 0
  let lowStockCount = 0

  for (const p of products) {
    const stock = p.stock ?? 0
    totalStock += stock
    purchaseValue += (p.purchasePrice ?? 0) * stock
    sellingValue += (p.sellingPrice ?? 0) * stock
    if (p.isActive) activeCount += 1
    else inactiveCount += 1
    if (stock <= LOW_STOCK_THRESHOLD) lowStockCount += 1
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

export function computeInventoryCategoryBreakdown(products = []) {
  const map = new Map()

  for (const p of products) {
    const category = p.categoryName || 'Tanpa Kategori'
    const cur = map.get(category) ?? {
      count: 0,
      stock: 0,
      purchaseValue: 0,
      sellingValue: 0,
      lowStockCount: 0,
    }
    const stock = p.stock ?? 0
    map.set(category, {
      count: cur.count + 1,
      stock: cur.stock + stock,
      purchaseValue: cur.purchaseValue + (p.purchasePrice ?? 0) * stock,
      sellingValue: cur.sellingValue + (p.sellingPrice ?? 0) * stock,
      lowStockCount: cur.lowStockCount + (stock <= LOW_STOCK_THRESHOLD ? 1 : 0),
    })
  }

  return [...map.entries()]
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.stock - a.stock)
}

export function computeMovementSummary(movements = []) {
  let inQty = 0
  let outQty = 0
  let inLines = 0
  let outLines = 0

  for (const m of movements) {
    const qty = m.qty ?? 0
    if (m.movementType === 'IN') {
      inQty += qty
      inLines += 1
    } else if (m.movementType === 'OUT') {
      outQty += qty
      outLines += 1
    }
  }

  return {
    totalLines: movements.length,
    inQty,
    outQty,
    inLines,
    outLines,
    netQty: inQty - outQty,
  }
}

export function formatInventoryFilterSummary(filters) {
  const parts = []

  if (filters.search?.trim()) parts.push(`Pencarian: "${filters.search.trim()}"`)
  if (filters.lowStockOnly) parts.push(`Stok rendah (≤${LOW_STOCK_THRESHOLD})`)
  if (filters.movementType === 'IN') parts.push('Pergerakan: Masuk (IN)')
  if (filters.movementType === 'OUT') parts.push('Pergerakan: Keluar (OUT)')
  if (filters.movementSearch?.trim()) {
    parts.push(`Riwayat: "${filters.movementSearch.trim()}"`)
  }

  return parts.length ? parts.join(' · ') : 'Semua data persediaan'
}

export function movementTypeLabel(type) {
  if (type === 'IN') return 'IN — Masuk'
  if (type === 'OUT') return 'OUT — Keluar'
  return type || '—'
}

export function productStatusLabel(isActive) {
  return isActive ? 'Aktif' : 'Nonaktif'
}

export function rupiahPlain(amount) {
  return formatRupiah(amount).replace(/\u00a0/g, ' ')
}

export { formatReportDateTime, formatRupiah }
