import { useCallback, useState } from 'react'

export function cartItemFromProduct(product) {
  return {
    productId: product.id,
    productCode: product.productCode,
    productName: product.productName,
    unit: product.unit,
    price: product.sellingPrice,
    qty: 1,
    discount: 0,
    maxStock: product.stock,
  }
}

export function cartItemFromDetail(item) {
  return {
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    unit: item.unit,
    price: item.price,
    qty: item.qty,
    discount: item.discount,
    maxStock: (item.stock ?? 0) + item.qty,
  }
}

export function useCart(initialItems = []) {
  const [cart, setCart] = useState(initialItems)

  const addProduct = useCallback((product, { respectStock = true } = {}) => {
    if (respectStock && product.stock <= 0) return
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id)
      if (idx >= 0) {
        const next = [...prev]
        const newQty = next[idx].qty + 1
        if (respectStock && newQty > product.stock) return prev
        next[idx] = { ...next[idx], qty: newQty }
        return next
      }
      return [...prev, cartItemFromProduct(product)]
    })
  }, [])

  const updateItem = useCallback((productId, field, value) => {
    setCart((prev) => prev.map((item) => {
      if (item.productId !== productId) return item
      if (field === 'qty') {
        const max = item.maxStock ?? Number.MAX_SAFE_INTEGER
        const qty = Math.max(1, Math.min(Number(value) || 1, max))
        return { ...item, qty }
      }
      if (field === 'price') return { ...item, price: Math.max(0, Number(value) || 0) }
      if (field === 'discount') return { ...item, discount: Math.max(0, Number(value) || 0) }
      return item
    }))
  }, [])

  const removeItem = useCallback((productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const clear = useCallback(() => setCart([]), [])

  const loadItems = useCallback((items) => setCart(items), [])

  return { cart, addProduct, updateItem, removeItem, clear, loadItems }
}
