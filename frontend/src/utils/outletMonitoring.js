export function computeOutletSummary(transactions = [], outlets = []) {
  const map = new Map()

  for (const outlet of outlets) {
    map.set(outlet.id, {
      outletId: outlet.id,
      outletName: outlet.outletName,
      transactionCount: 0,
      subTotal: 0,
      discount: 0,
      tax: 0,
      grandTotal: 0,
    })
  }

  for (const tx of transactions) {
    if (!map.has(tx.outletId)) {
      map.set(tx.outletId, {
        outletId: tx.outletId,
        outletName: tx.outletName || '—',
        transactionCount: 0,
        subTotal: 0,
        discount: 0,
        tax: 0,
        grandTotal: 0,
      })
    }

    const row = map.get(tx.outletId)
    row.transactionCount += 1
    row.subTotal += tx.subTotal ?? 0
    row.discount += tx.discount ?? 0
    row.tax += tx.tax ?? 0
    row.grandTotal += tx.grandTotal ?? 0
  }

  const rows = [...map.values()].sort((a, b) => b.grandTotal - a.grandTotal)
  const totalGrand = rows.reduce((sum, row) => sum + row.grandTotal, 0)

  return rows.map((row) => ({
    ...row,
    avgPerTransaction: row.transactionCount ? row.grandTotal / row.transactionCount : 0,
    contributionPercent: totalGrand ? (row.grandTotal / totalGrand) * 100 : 0,
  }))
}

export function computeMonitoringSummary(transactions = [], outletRows = []) {
  const totalGrandTotal = transactions.reduce((sum, tx) => sum + (tx.grandTotal ?? 0), 0)
  const activeOutlets = outletRows.filter((row) => row.transactionCount > 0).length
  const bestOutlet = outletRows.find((row) => row.transactionCount > 0) ?? null

  return {
    totalTransactions: transactions.length,
    totalGrandTotal,
    activeOutlets,
    totalOutlets: outletRows.length,
    bestOutlet,
    avgPerTransaction: transactions.length ? totalGrandTotal / transactions.length : 0,
  }
}
