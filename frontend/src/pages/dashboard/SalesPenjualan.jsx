import { useState } from 'react'
import { salesApi } from '../../api/sales'
import Button from '../../components/ui/Button'
import PageShell from '../../components/ui/PageShell'
import {
  CartTable,
  CheckoutLayout,
  OrderSummary,
  PaymentForm,
  ProductSearchGrid,
  TransactionContextFields,
} from '../../components/pos'
import { useCart } from '../../hooks/useCart'
import { useOrderTotals } from '../../hooks/useOrderTotals'
import { useSalesFormData } from '../../hooks/useSalesFormData'
import { formatRupiah } from '../../utils/format'

export default function SalesPenjualan() {
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

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [customerId, setCustomerId] = useState('')
  const [headerDiscount, setHeaderDiscount] = useState(0)
  const [taxPercent, setTaxPercent] = useState(10)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paidAmount, setPaidAmount] = useState('')

  const { cart, addProduct, updateItem, removeItem, clear } = useCart()
  const { lineSubTotal, taxAmount, grandTotal } = useOrderTotals(cart, headerDiscount, taxPercent)
  const changeAmount = Math.max(Number(paidAmount || 0) - grandTotal, 0)

  const resetForm = () => {
    clear()
    setCustomerId('')
    setHeaderDiscount(0)
    setTaxPercent(10)
    setPaymentMethod('Cash')
    setPaidAmount('')
    setSuccess(null)
    setError('')
  }

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
      setSuccess(
        <>
          <strong>Transaksi berhasil!</strong>
          <span>Invoice: {result.invoiceNumber}</span>
          <span>Total: {formatRupiah(result.grandTotal)}</span>
          <span>Kembalian: {formatRupiah(result.changeAmount)}</span>
        </>,
      )
      clear()
      setPaidAmount('')
      setHeaderDiscount(0)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell
      title="Penjualan"
      description="Transaksi kasir — data tersimpan ke SalesTransactions & SalesTransactionDetails"
      loading={loading}
      loadingMessage="Memuat data penjualan..."
      error={!formData ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi dan API berjalan."
      success={success}
      onDismissSuccess={() => setSuccess(null)}
    >
      {error && formData && (
        <div className="ui-alert ui-alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
      )}

      {formData && (
        <form onSubmit={handleSubmit}>
          <CheckoutLayout
            productsPanel={(
              <ProductSearchGrid
                products={formData.products}
                onSelect={addProduct}
                respectStock
              />
            )}
            checkoutPanel={(
              <>
                <TransactionContextFields
                  formData={formData}
                  outletId={outletId}
                  userId={userId}
                  customerId={customerId}
                  onOutletChange={setOutletId}
                  onUserChange={setUserId}
                  onCustomerChange={setCustomerId}
                />
                <CartTable
                  cart={cart}
                  onUpdateItem={updateItem}
                  onRemoveItem={removeItem}
                  emptyMessage="Klik produk di kiri untuk menambahkan ke keranjang"
                />
                <OrderSummary
                  lineSubTotal={lineSubTotal}
                  headerDiscount={headerDiscount}
                  taxPercent={taxPercent}
                  taxAmount={taxAmount}
                  grandTotal={grandTotal}
                  onDiscountChange={setHeaderDiscount}
                  onTaxPercentChange={setTaxPercent}
                  discountLabel="Diskon (header)"
                />
                <PaymentForm
                  paymentMethod={paymentMethod}
                  paidAmount={paidAmount}
                  changeAmount={changeAmount}
                  grandTotal={grandTotal}
                  onPaymentMethodChange={setPaymentMethod}
                  onPaidAmountChange={setPaidAmount}
                />
                <div className="ui-actions-row">
                  <Button variant="secondary" type="button" onClick={resetForm}>Reset</Button>
                  <Button variant="primary" type="submit" disabled={submitting || cart.length === 0}>
                    {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                  </Button>
                </div>
              </>
            )}
          />
        </form>
      )}
    </PageShell>
  )
}
