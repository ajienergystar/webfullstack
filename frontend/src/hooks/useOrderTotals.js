import { useMemo } from 'react'

export function useOrderTotals(cart, headerDiscount, taxPercent) {
  const lineSubTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price - item.discount, 0),
    [cart],
  )

  const taxAmount = useMemo(() => {
    const base = Math.max(lineSubTotal - Number(headerDiscount || 0), 0)
    return Math.round(base * (Number(taxPercent || 0) / 100))
  }, [lineSubTotal, headerDiscount, taxPercent])

  const grandTotal = useMemo(
    () => Math.max(lineSubTotal - Number(headerDiscount || 0) + taxAmount, 0),
    [lineSubTotal, headerDiscount, taxAmount],
  )

  return { lineSubTotal, taxAmount, grandTotal }
}
