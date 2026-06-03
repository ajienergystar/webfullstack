import { useCallback, useEffect, useMemo, useState } from 'react'
import { salesApi } from '../../api/sales'
import { holdApi } from '../../api/hold'
import { formatRupiah } from '../../api/dashboard'
import '../../styles/sales.css'

const PAYMENT_METHODS = ['Cash', 'QRIS', 'Transfer', 'Debit', 'Credit']

function emptyCart() {
  return []
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function SalesHold() {
  const [view, setView] = useState('list')
  const [formData, setFormData] = useState(null)
  const [holdList, setHoldList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState(emptyCart)
  const [outletId, setOutletId] = useState('')
  const [userId, setUserId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [headerDiscount, setHeaderDiscount] = useState(0)
  const [taxPercent, setTaxPercent] = useState(10)
  const [notes, setNotes] = useState('')

  const [completeTarget, setCompleteTarget] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paidAmount, setPaidAmount] = useState('')

  const loadList = useCallback(async () => {
    const data = await holdApi.list()
    setHoldList(data)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        const [fd, hl] = await Promise.all([salesApi.getFormData(), holdApi.list()])
        if (cancelled) return
        setFormData(fd)
        setHoldList(hl)
        const cashier = fd.users.find((u) => u.roleName === 'Cashier') ?? fd.users[0]
        if (cashier) setUserId(String(cashier.id))
        if (fd.outlets[0]) setOutletId(String(fd.outlets[0].id))
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const filteredProducts = useMemo(() => {
    if (!formData?.products) return []
    const q = search.trim().toLowerCase()
    if (!q) return formData.products
    return formData.products.filter((p) =>
      p.productName.toLowerCase().includes(q)
      || p.productCode.toLowerCase().includes(q)
      || (p.barcode && p.barcode.includes(q)),
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

  const resetForm = () => {
    setCart(emptyCart())
    setCustomerId('')
    setHeaderDiscount(0)
    setTaxPercent(10)
    setNotes('')
    setEditingId(null)
    setError('')
  }

  const openNewHold = () => {
    resetForm()
    setView('form')
  }

  const addToCart = (product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
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
  }

  const updateCartItem = (productId, field, value) => {
    setCart((prev) => prev.map((item) => {
      if (item.productId !== productId) return item
      if (field === 'qty') return { ...item, qty: Math.max(1, Number(value) || 1) }
      if (field === 'price') return { ...item, price: Math.max(0, Number(value) || 0) }
      if (field === 'discount') return { ...item, discount: Math.max(0, Number(value) || 0) }
      return item
    }))
  }

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const buildPayload = () => ({
    customerId: customerId ? Number(customerId) : null,
    userId: Number(userId),
    outletId: Number(outletId),
    discount: Number(headerDiscount || 0),
    tax: taxAmount,
    notes: notes || null,
    items: cart.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      price: item.price,
      discount: item.discount,
    })),
  })

  const handleSaveHold = async (e) => {
    e.preventDefault()
    if (cart.length === 0) {
      setError('Tambahkan minimal satu produk.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = buildPayload()
      if (editingId) {
        await holdApi.update(editingId, payload)
        setSuccess(`Hold ${editingId} diperbarui.`)
      } else {
        const result = await holdApi.create(payload)
        setSuccess(`Hold tersimpan: ${result.holdNumber}`)
      }
      resetForm()
      await loadList()
      setView('list')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (id) => {
    setError('')
    try {
      const detail = await holdApi.getById(id)
      setEditingId(id)
      setCustomerId(detail.customerId ? String(detail.customerId) : '')
      setUserId(String(detail.userId))
      setOutletId(String(detail.outletId))
      setHeaderDiscount(detail.discount)
      setTaxPercent(detail.subTotal > 0 ? Math.round((detail.tax / detail.subTotal) * 100) : 10)
      setNotes(detail.notes || '')
      setCart(detail.items.map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        price: item.price,
        qty: item.qty,
        discount: item.discount,
        maxStock: item.stock + item.qty,
      })))
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCancel = async (id, holdNumber) => {
    if (!window.confirm(`Batalkan hold ${holdNumber}?`)) return
    try {
      await holdApi.cancel(id)
      setSuccess(`Hold ${holdNumber} dibatalkan.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    }
  }

  const openComplete = (hold) => {
    setCompleteTarget(hold)
    setPaymentMethod('Cash')
    setPaidAmount(String(Math.ceil(hold.grandTotal / 1000) * 1000))
    setError('')
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    if (!completeTarget) return
    const paid = Number(paidAmount || 0)
    if (paid < completeTarget.grandTotal) {
      setError('Jumlah bayar kurang dari total.')
      return
    }
    setSubmitting(true)
    try {
      const result = await holdApi.complete(completeTarget.id, {
        paymentMethod,
        paidAmount: paid,
      })
      setSuccess(`Selesai! Invoice: ${result.invoiceNumber}, Kembalian: ${formatRupiah(result.changeAmount)}`)
      setCompleteTarget(null)
      const fd = await salesApi.getFormData()
      setFormData(fd)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const completeChange = completeTarget
    ? Math.max(Number(paidAmount || 0) - completeTarget.grandTotal, 0)
    : 0

  if (loading) {
    return <div className="sales-loading">Memuat hold transaksi...</div>
  }

  return (
    <div className="sales-page riwayat-page">
      <div className="sales-page-header hold-header">
        <div>
          <h1>Hold Transaksi</h1>
          <p>Simpan keranjang sementara — HeldTransactions & HeldTransactionDetails</p>
        </div>
        {view === 'list' && (
          <button type="button" className="sales-btn-primary" onClick={openNewHold}>
            + Hold Baru
          </button>
        )}
        {view === 'form' && (
          <button type="button" className="sales-btn-secondary" onClick={() => { resetForm(); setView('list') }}>
            ← Kembali ke Daftar
          </button>
        )}
      </div>

      {error && <div className="sales-alert sales-alert-error">{error}</div>}
      {success && (
        <div className="sales-alert sales-alert-success">
          {success}
          <button type="button" className="hold-dismiss" onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {view === 'list' && (
        <>
          <div className="riwayat-summary">
            <div className="riwayat-summary-card">
              <span>Hold Aktif</span>
              <strong>{holdList?.totalCount ?? 0}</strong>
            </div>
          </div>

          <div className="riwayat-table-panel">
            <div className="riwayat-table-wrap">
              <table className="riwayat-table">
                <thead>
                  <tr>
                    <th>No. Hold</th>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th>Outlet</th>
                    <th>Kasir</th>
                    <th>Item</th>
                    <th>Total</th>
                    <th>Catatan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {!holdList?.holds?.length ? (
                    <tr>
                      <td colSpan={9} className="sales-cart-empty">
                        Belum ada transaksi di-hold. Klik &quot;Hold Baru&quot; untuk menyimpan keranjang.
                      </td>
                    </tr>
                  ) : (
                    holdList.holds.map((h) => (
                      <tr key={h.id}>
                        <td className="riwayat-invoice">{h.holdNumber}</td>
                        <td>{formatDateTime(h.heldAt)}</td>
                        <td>{h.customerName}</td>
                        <td>{h.outletName}</td>
                        <td>{h.cashierName}</td>
                        <td>{h.itemCount}</td>
                        <td className="riwayat-amount">{formatRupiah(h.grandTotal)}</td>
                        <td>{h.notes || '—'}</td>
                        <td className="hold-actions-cell">
                          <button type="button" className="riwayat-btn-detail" onClick={() => handleEdit(h.id)}>
                            Edit
                          </button>
                          <button type="button" className="hold-btn-complete" onClick={() => openComplete(h)}>
                            Bayar
                          </button>
                          <button type="button" className="hold-btn-cancel" onClick={() => handleCancel(h.id, h.holdNumber)}>
                            Batal
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'form' && formData && (
        <form className="sales-layout" onSubmit={handleSaveHold}>
          <section className="sales-products-panel">
            <div className="sales-search-bar">
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="sales-product-grid">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="sales-product-card"
                  onClick={() => addToCart(product)}
                >
                  <div className="sales-product-name">{product.productName}</div>
                  <div className="sales-product-price">{formatRupiah(product.sellingPrice)}</div>
                  <div className="sales-product-stock">Stok: {product.stock}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="sales-checkout-panel">
            <h3 className="hold-form-title">{editingId ? 'Edit Hold' : 'Hold Baru'}</h3>

            <div className="sales-form-row sales-form-row-3">
              <label>
                Outlet
                <select value={outletId} onChange={(e) => setOutletId(e.target.value)} required>
                  {formData.outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </label>
              <label>
                Kasir
                <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                  {formData.users.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </label>
              <label>
                Pelanggan
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Walk-in</option>
                  {formData.customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.customerName}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="hold-notes-label">
              Catatan
              <input
                type="text"
                placeholder="Opsional, mis. Meja 5"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

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
                      <td colSpan={6} className="sales-cart-empty">Pilih produk untuk di-hold</td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.productId}>
                        <td>{item.productName}</td>
                        <td>
                          <input
                            type="number"
                            className="sales-input-sm"
                            value={item.price}
                            onChange={(e) => updateCartItem(item.productId, 'price', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="sales-input-sm"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateCartItem(item.productId, 'qty', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="sales-input-sm"
                            value={item.discount}
                            onChange={(e) => updateCartItem(item.productId, 'discount', e.target.value)}
                          />
                        </td>
                        <td>{formatRupiah(item.qty * item.price - item.discount)}</td>
                        <td>
                          <button type="button" className="sales-btn-remove" onClick={() => removeFromCart(item.productId)}>×</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="sales-summary">
              <div className="sales-summary-row"><span>Subtotal</span><strong>{formatRupiah(lineSubTotal)}</strong></div>
              <div className="sales-summary-row">
                <label>
                  Diskon
                  <input type="number" min="0" value={headerDiscount} onChange={(e) => setHeaderDiscount(e.target.value)} />
                </label>
              </div>
              <div className="sales-summary-row">
                <label>
                  Pajak (%)
                  <input type="number" min="0" max="100" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
                </label>
                <strong>{formatRupiah(taxAmount)}</strong>
              </div>
              <div className="sales-summary-row sales-grand-total">
                <span>Grand Total</span>
                <strong>{formatRupiah(grandTotal)}</strong>
              </div>
            </div>

            <div className="sales-actions">
              <button type="button" className="sales-btn-secondary" onClick={() => { resetForm(); setView('list') }}>
                Batal
              </button>
              <button type="submit" className="sales-btn-primary" disabled={submitting || cart.length === 0}>
                {submitting ? 'Menyimpan...' : editingId ? 'Perbarui Hold' : 'Simpan Hold'}
              </button>
            </div>
          </section>
        </form>
      )}

      {completeTarget && (
        <div className="riwayat-modal-overlay" onClick={() => setCompleteTarget(null)} role="presentation">
          <div className="riwayat-modal hold-complete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="riwayat-modal-header">
              <div>
                <h2>Selesaikan Hold</h2>
                <p>{completeTarget.holdNumber} — {formatRupiah(completeTarget.grandTotal)}</p>
              </div>
              <button type="button" className="riwayat-modal-close" onClick={() => setCompleteTarget(null)}>×</button>
            </div>
            <form onSubmit={handleComplete}>
              <div className="sales-payment" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="sales-change" style={{ marginBottom: '1rem' }}>
                <span>Kembalian</span>
                <strong>{formatRupiah(completeChange)}</strong>
              </div>
              <p className="hold-complete-hint">
                Stok akan dikurangi dan transaksi masuk ke SalesTransactions.
              </p>
              <div className="sales-actions">
                <button type="button" className="sales-btn-secondary" onClick={() => setCompleteTarget(null)}>
                  Tutup
                </button>
                <button type="submit" className="sales-btn-primary" disabled={submitting}>
                  {submitting ? 'Memproses...' : 'Selesaikan & Cetak Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
