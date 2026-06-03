import { useCallback, useEffect, useState } from 'react'
import { holdApi } from '../../api/hold'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  CartTable,
  CheckoutLayout,
  OrderSummary,
  PaymentForm,
  ProductSearchGrid,
  TransactionContextFields,
} from '../../components/pos'
import { cartItemFromDetail, useCart } from '../../hooks/useCart'
import { useOrderTotals } from '../../hooks/useOrderTotals'
import { useSalesFormData } from '../../hooks/useSalesFormData'
import { formatDateTime, formatRupiah } from '../../utils/format'

export default function SalesHold() {
  const [view, setView] = useState('list')
  const {
    formData,
    loading,
    error,
    setError,
    outletId,
    setOutletId,
    userId,
    setUserId,
    refresh,
  } = useSalesFormData()

  const [holdList, setHoldList] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [headerDiscount, setHeaderDiscount] = useState(0)
  const [taxPercent, setTaxPercent] = useState(10)
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [completeTarget, setCompleteTarget] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paidAmount, setPaidAmount] = useState('')

  const { cart, addProduct, updateItem, removeItem, clear, loadItems } = useCart()
  const { lineSubTotal, taxAmount, grandTotal } = useOrderTotals(cart, headerDiscount, taxPercent)

  const loadList = useCallback(async () => {
    setHoldList(await holdApi.list())
  }, [])

  useEffect(() => {
    if (!loading && formData) loadList().catch((err) => setError(err.message))
  }, [loading, formData, loadList, setError])

  const resetForm = () => {
    clear()
    setCustomerId('')
    setHeaderDiscount(0)
    setTaxPercent(10)
    setNotes('')
    setEditingId(null)
    setError('')
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
        setSuccess(`Hold diperbarui.`)
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
      loadItems(detail.items.map(cartItemFromDetail))
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
      const result = await holdApi.complete(completeTarget.id, { paymentMethod, paidAmount: paid })
      setSuccess(`Selesai! Invoice: ${result.invoiceNumber}, Kembalian: ${formatRupiah(result.changeAmount)}`)
      setCompleteTarget(null)
      await refresh()
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

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={() => { resetForm(); setView('form') }}>
      + Hold Baru
    </Button>
  ) : (
    <Button variant="secondary" type="button" onClick={() => { resetForm(); setView('list') }}>
      ← Kembali ke Daftar
    </Button>
  )

  return (
    <PageShell
      title="Hold Transaksi"
      description="HeldTransactions & HeldTransactionDetails — stok dikurangi saat dibayar"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat hold transaksi..."
      error={!formData ? error : undefined}
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && formData && <div className="ui-alert ui-alert-error">{error}</div>}

      {formData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Hold Aktif" value={holdList?.totalCount ?? 0} />
          </div>
          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
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
                      <td colSpan={9} className="ui-table-empty">
                        Belum ada transaksi di-hold. Klik &quot;Hold Baru&quot; untuk menyimpan keranjang.
                      </td>
                    </tr>
                  ) : (
                    holdList.holds.map((h) => (
                      <tr key={h.id}>
                        <td className="pos-ref-link">{h.holdNumber}</td>
                        <td>{formatDateTime(h.heldAt)}</td>
                        <td>{h.customerName}</td>
                        <td>{h.outletName}</td>
                        <td>{h.cashierName}</td>
                        <td>{h.itemCount}</td>
                        <td className="pos-amount">{formatRupiah(h.grandTotal)}</td>
                        <td>{h.notes || '—'}</td>
                        <td className="pos-actions-cell">
                          <Button variant="secondary" size="sm" type="button" onClick={() => handleEdit(h.id)}>
                            Edit
                          </Button>
                          <Button variant="success" size="sm" type="button" onClick={() => openComplete(h)}>
                            Bayar
                          </Button>
                          <Button variant="danger" size="sm" type="button" onClick={() => handleCancel(h.id, h.holdNumber)}>
                            Batal
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {formData && view === 'form' && (
        <form onSubmit={handleSaveHold}>
          <CheckoutLayout
            productsPanel={(
              <ProductSearchGrid
                products={formData.products}
                onSelect={(p) => addProduct(p, { respectStock: false })}
                respectStock={false}
                searchPlaceholder="Cari produk..."
              />
            )}
            checkoutPanel={(
              <>
                <h3 className="pos-form-title">{editingId ? 'Edit Hold' : 'Hold Baru'}</h3>
                <TransactionContextFields
                  formData={formData}
                  outletId={outletId}
                  userId={userId}
                  customerId={customerId}
                  onOutletChange={setOutletId}
                  onUserChange={setUserId}
                  onCustomerChange={setCustomerId}
                  showNotes
                  notes={notes}
                  onNotesChange={setNotes}
                />
                <CartTable
                  cart={cart}
                  onUpdateItem={updateItem}
                  onRemoveItem={removeItem}
                  emptyMessage="Pilih produk untuk di-hold"
                  enforceMaxStock={false}
                />
                <OrderSummary
                  lineSubTotal={lineSubTotal}
                  headerDiscount={headerDiscount}
                  taxPercent={taxPercent}
                  taxAmount={taxAmount}
                  grandTotal={grandTotal}
                  onDiscountChange={setHeaderDiscount}
                  onTaxPercentChange={setTaxPercent}
                />
                <div className="ui-actions-row">
                  <Button variant="secondary" type="button" onClick={() => { resetForm(); setView('list') }}>
                    Batal
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting || cart.length === 0}>
                    {submitting ? 'Menyimpan...' : editingId ? 'Perbarui Hold' : 'Simpan Hold'}
                  </Button>
                </div>
              </>
            )}
          />
        </form>
      )}

      <Modal
        open={!!completeTarget}
        onClose={() => setCompleteTarget(null)}
        title="Selesaikan Hold"
        subtitle={completeTarget ? `${completeTarget.holdNumber} — ${formatRupiah(completeTarget.grandTotal)}` : ''}
        size="sm"
      >
        {completeTarget && (
          <form onSubmit={handleComplete}>
            <PaymentForm
              layout="grid"
              paymentMethod={paymentMethod}
              paidAmount={paidAmount}
              changeAmount={completeChange}
              grandTotal={completeTarget.grandTotal}
              onPaymentMethodChange={setPaymentMethod}
              onPaidAmountChange={setPaidAmount}
            />
            <p className="pos-complete-hint">
              Stok akan dikurangi dan transaksi masuk ke SalesTransactions.
            </p>
            <div className="ui-actions-row">
              <Button variant="secondary" type="button" onClick={() => setCompleteTarget(null)}>Tutup</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Memproses...' : 'Selesaikan & Cetak Invoice'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </PageShell>
  )
}
