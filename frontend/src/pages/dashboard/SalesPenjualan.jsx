import { useCallback, useEffect, useMemo, useState } from 'react'
import { salesApi } from '../../api/sales'
import { formatRupiah } from '../../api/dashboard'
import '../../styles/sales.css'

const PAYMENT_METHODS = ['Cash', 'QRIS', 'Transfer', 'Debit', 'Credit']

function emptyCart() {
  return []
}

export default function SalesPenjualan() {
  const [formData, setFormData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState(emptyCart)
  const [outletId, setOutletId] = useState('')
  const [userId, setUserId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [headerDiscount, setHeaderDiscount] = useState(0)
  const [taxPercent, setTaxPercent] = useState(10)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paidAmount, setPaidAmount] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')
        const data = await salesApi.getFormData()
        if (cancelled) return
        setFormData(data)
        const cashier = data.users.find((u) => u.roleName === 'Cashier') ?? data.users[0]
        if (cashier) setUserId(String(cashier.id))
        if (data.outlets[0]) setOutletId(String(data.outlets[0].id))
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filteredProducts = useMemo(() => {
    if (!formData?.products) return []
    const q = search.trim().toLowerCase()
    if (!q) return formData.products
    return formData.products.filter((p) =>
      p.productName.toLowerCase().includes(q)
      || p.productCode.toLowerCase().includes(q)
      || (p.barcode && p.barcode.includes(q))
      || (p.categoryName && p.categoryName.toLowerCase().includes(q))
    )
  }, [formData, search])

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

  const changeAmount = useMemo(() => {
    const paid = Number(paidAmount || 0)
    return paid > grandTotal ? paid - grandTotal : 0
  }, [paidAmount, grandTotal])

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) return
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id)
      if (idx >= 0) {
        const next = [...prev]
        const newQty = next[idx].qty + 1
        if (newQty > product.stock) return prev
        next[idx] = { ...next[idx], qty: newQty }
        return next
      }
      return [...prev, {
        productId: product.id,
        productCode: product.productCode,
        productName: product.productName,
        unit: product.unit,
        price: product.sellingPrice,
        qty: 1,
        discount: 0,
        maxStock: product.stock,
      }]
    })
  }, [])

  const updateCartItem = useCallback((productId, field, value) => {
    setCart((prev) => prev.map((item) => {
      if (item.productId !== productId) return item
      if (field === 'qty') {
        const qty = Math.max(1, Math.min(Number(value) || 1, item.maxStock))
        return { ...item, qty }
      }
      if (field === 'price') {
        return { ...item, price: Math.max(0, Number(value) || 0) }
      }
      if (field === 'discount') {
        return { ...item, discount: Math.max(0, Number(value) || 0) }
      }
      return item
    }))
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const resetForm = useCallback(() => {
    setCart(emptyCart())
    setCustomerId('')
    setHeaderDiscount(0)
    setTaxPercent(10)
    setPaymentMethod('Cash')
    setPaidAmount('')
    setSuccess(null)
    setError('')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cart.length === 0) {
      setError('Tambahkan minimal satu produk.')
      return
    }
    if (!outletId || !userId) {
      setError('Outlet dan kasir wajib dipilih.')
      return
    }
    const paid = Number(paidAmount || 0)
    if (paid < grandTotal) {
      setError('Jumlah bayar kurang dari total.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await salesApi.createSale({
        customerId: customerId ? Number(customerId) : null,
        userId: Number(userId),
        outletId: Number(outletId),
        discount: Number(headerDiscount || 0),
        tax: taxAmount,
        paymentMethod,
        paidAmount: paid,
        items: cart.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          discount: item.discount,
        })),
      })
      setSuccess(result)
      setCart(emptyCart())
      setPaidAmount('')
      setHeaderDiscount(0)
      // Refresh product stock
      const data = await salesApi.getFormData()
      setFormData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="sales-loading">Memuat data penjualan...</div>
  }

  if (!formData && error) {
    return (
      <div className="sales-error">
        <p>{error}</p>
        <p className="sales-error-hint">Pastikan database POS sudah diinisialisasi dan API berjalan.</p>
      </div>
    )
  }

  return (
    <div className="sales-page">
      <div className="sales-page-header">
        <h1>Penjualan</h1>
        <p>Transaksi kasir — data tersimpan ke SalesTransactions & SalesTransactionDetails</p>
      </div>

      {error && <div className="sales-alert sales-alert-error">{error}</div>}
      {success && (
        <div className="sales-alert sales-alert-success">
          <strong>Transaksi berhasil!</strong>
          <span>Invoice: {success.invoiceNumber}</span>
          <span>Total: {formatRupiah(success.grandTotal)}</span>
          <span>Kembalian: {formatRupiah(success.changeAmount)}</span>
        </div>
      )}

      <form className="sales-layout" onSubmit={handleSubmit}>
        <section className="sales-products-panel">
          <div className="sales-search-bar">
            <input
              type="text"
              placeholder="Cari produk (nama, kode, barcode)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="sales-product-grid">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className={`sales-product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
              >
                <div className="sales-product-name">{product.productName}</div>
                <div className="sales-product-code">{product.productCode}</div>
                <div className="sales-product-price">{formatRupiah(product.sellingPrice)}</div>
                <div className="sales-product-stock">
                  Stok: {product.stock} {product.unit || ''}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="sales-checkout-panel">
          <div className="sales-form-row sales-form-row-3">
            <label>
              Outlet
              <select value={outletId} onChange={(e) => setOutletId(e.target.value)} required>
                <option value="">Pilih outlet</option>
                {formData.outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.outletName}</option>
                ))}
              </select>
            </label>
            <label>
              Kasir
              <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Pilih kasir</option>
                {formData.users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.roleName})</option>
                ))}
              </select>
            </label>
            <label>
              Pelanggan
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in</option>
                {formData.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerName}{c.phoneNumber ? ` — ${c.phoneNumber}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sales-cart-table-wrap">
            <table className="sales-cart-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Harga</th>
                  <th>Qty</th>
                  <th>Diskon</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="sales-cart-empty">
                      Klik produk di kiri untuk menambahkan ke keranjang
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        <div className="sales-cart-product">{item.productName}</div>
                        <div className="sales-cart-code">{item.productCode}</div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.price}
                          onChange={(e) => updateCartItem(item.productId, 'price', e.target.value)}
                          className="sales-input-sm"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          max={item.maxStock}
                          value={item.qty}
                          onChange={(e) => updateCartItem(item.productId, 'qty', e.target.value)}
                          className="sales-input-sm"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.discount}
                          onChange={(e) => updateCartItem(item.productId, 'discount', e.target.value)}
                          className="sales-input-sm"
                        />
                      </td>
                      <td className="sales-line-total">
                        {formatRupiah(item.qty * item.price - item.discount)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="sales-btn-remove"
                          onClick={() => removeFromCart(item.productId)}
                          aria-label="Hapus"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="sales-summary">
            <div className="sales-summary-row">
              <span>Subtotal</span>
              <strong>{formatRupiah(lineSubTotal)}</strong>
            </div>
            <div className="sales-summary-row">
              <label>
                Diskon (header)
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={headerDiscount}
                  onChange={(e) => setHeaderDiscount(e.target.value)}
                />
              </label>
            </div>
            <div className="sales-summary-row">
              <label>
                Pajak (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                />
              </label>
              <strong>{formatRupiah(taxAmount)}</strong>
            </div>
            <div className="sales-summary-row sales-grand-total">
              <span>Grand Total</span>
              <strong>{formatRupiah(grandTotal)}</strong>
            </div>
          </div>

          <div className="sales-payment">
            <label>
              Metode Bayar
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              Jumlah Bayar
              <input
                type="number"
                min="0"
                step="1000"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={formatRupiah(grandTotal)}
                required
              />
            </label>
            <div className="sales-change">
              <span>Kembalian</span>
              <strong>{formatRupiah(changeAmount)}</strong>
            </div>
          </div>

          <div className="sales-actions">
            <button type="button" className="sales-btn-secondary" onClick={resetForm}>
              Reset
            </button>
            <button type="submit" className="sales-btn-primary" disabled={submitting || cart.length === 0}>
              {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </section>
      </form>
    </div>
  )
}
