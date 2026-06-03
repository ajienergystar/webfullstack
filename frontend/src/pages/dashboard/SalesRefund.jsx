import { useCallback, useEffect, useMemo, useState } from 'react'
import { refundApi } from '../../api/refund'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  PaymentBadge,
  PaymentForm,
  RefundDetailModal,
  RefundLineSelector,
  RefundReasonField,
} from '../../components/pos'
import { useSalesFormData } from '../../hooks/useSalesFormData'
import { formatDateTime, formatRupiah } from '../../utils/format'

export default function SalesRefund() {
  const [view, setView] = useState('list')
  const { formData, loading, error, setError, outletId, setOutletId, userId, setUserId } = useSalesFormData()

  const [refundList, setRefundList] = useState(null)
  const [listFilter, setListFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [sale, setSale] = useState(null)
  const [saleLoading, setSaleLoading] = useState(false)
  const [selections, setSelections] = useState({})
  const [reason, setReason] = useState('')
  const [refundMethod, setRefundMethod] = useState('Cash')

  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadList = useCallback(async (invoice) => {
    const data = await refundApi.list(invoice || undefined)
    setRefundList(data)
  }, [])

  useEffect(() => {
    if (!loading && formData) {
      loadList().catch((err) => setError(err.message))
    }
  }, [loading, formData, loadList, setError])

  const totalRefund = useMemo(() => {
    if (!sale) return 0
    return sale.lines.reduce((sum, line) => {
      const qty = selections[line.salesDetailId] || 0
      return sum + qty * line.price
    }, 0)
  }, [sale, selections])

  const handleQtyChange = (detailId, value, line) => {
    const qty = Math.max(0, Math.min(Number(value) || 0, line.availableQty))
    setSelections((prev) => ({ ...prev, [detailId]: qty }))
  }

  const handleSearchInvoice = async (e) => {
    e.preventDefault()
    if (!invoiceSearch.trim()) {
      setError('Masukkan nomor invoice.')
      return
    }
    setSaleLoading(true)
    setError('')
    setSale(null)
    setSelections({})
    try {
      const data = await refundApi.getSaleByInvoice(invoiceSearch.trim())
      setSale(data)
      if (data.outletId) setOutletId(String(data.outletId))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaleLoading(false)
    }
  }

  const handleSubmitRefund = async (e) => {
    e.preventDefault()
    if (!sale) return

    const items = sale.lines
      .filter((l) => (selections[l.salesDetailId] || 0) > 0)
      .map((l) => ({
        salesDetailId: l.salesDetailId,
        productId: l.productId,
        qty: selections[l.salesDetailId],
        price: l.price,
      }))

    if (items.length === 0) {
      setError('Pilih minimal satu item dengan qty refund > 0.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await refundApi.create({
        salesTransactionId: sale.salesTransactionId,
        userId: Number(userId),
        outletId: Number(outletId),
        reason: reason || null,
        refundMethod,
        items,
      })
      setSuccess(`Refund berhasil: ${result.refundNumber} — ${formatRupiah(result.totalRefund)}`)
      setSale(null)
      setSelections({})
      setInvoiceSearch('')
      setReason('')
      await loadList()
      setView('list')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openDetail = async (id) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      setDetail(await refundApi.getById(id))
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={() => { setView('form'); setError(''); setSuccess('') }}>
      + Refund Baru
    </Button>
  ) : (
    <Button variant="secondary" type="button" onClick={() => { setView('list'); setSale(null); setError('') }}>
      ← Daftar Refund
    </Button>
  )

  return (
    <PageShell
      title="Refund / Retur"
      description="Refunds & RefundDetails — stok dikembalikan (StockMovements IN)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data..."
      error={!formData ? error : undefined}
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && formData && <div className="ui-alert ui-alert-error">{error}</div>}

      {formData && view === 'list' && (
        <>
          <Panel className="pos-filters">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                loadList(listFilter)
              }}
              className="pos-refund-list-filter"
            >
              <FormField label="Filter Invoice">
                <input
                  type="text"
                  placeholder="Cari invoice..."
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                />
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {refundList && (
            <div className="pos-stat-row">
              <StatCard label="Total Refund" value={refundList.totalCount} />
              <StatCard label="Nilai Refund" value={formatRupiah(refundList.totalRefundAmount)} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>No. Refund</th>
                    <th>Tanggal</th>
                    <th>Invoice</th>
                    <th>Pelanggan</th>
                    <th>Outlet</th>
                    <th>Total</th>
                    <th>Metode</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!refundList?.refunds?.length ? (
                    <tr>
                      <td colSpan={8} className="ui-table-empty">Belum ada data refund</td>
                    </tr>
                  ) : (
                    refundList.refunds.map((r) => (
                      <tr key={r.id}>
                        <td className="pos-ref-link">{r.refundNumber}</td>
                        <td>{formatDateTime(r.refundDate)}</td>
                        <td>{r.invoiceNumber}</td>
                        <td>{r.customerName}</td>
                        <td>{r.outletName}</td>
                        <td className="pos-amount">{formatRupiah(r.totalRefund)}</td>
                        <td><PaymentBadge method={r.refundMethod} /></td>
                        <td>
                          <Button variant="secondary" size="sm" type="button" onClick={() => openDetail(r.id)}>
                            Detail
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
        <form onSubmit={handleSubmitRefund}>
          <Panel title="1. Cari Transaksi Penjualan">
            <div className="pos-invoice-search">
              <FormField label="Nomor Invoice">
                <input
                  type="text"
                  placeholder="INV-20260529-001"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  required
                />
              </FormField>
              <Button variant="primary" type="button" onClick={handleSearchInvoice} disabled={saleLoading}>
                {saleLoading ? 'Mencari...' : 'Cari Invoice'}
              </Button>
            </div>
          </Panel>

          {sale && (
            <>
              <Panel title="2. Info Transaksi">
                <div className="pos-sale-info">
                  <div><span>Invoice</span><strong>{sale.invoiceNumber}</strong></div>
                  <div><span>Tanggal</span><strong>{formatDateTime(sale.transactionDate)}</strong></div>
                  <div><span>Pelanggan</span><strong>{sale.customerName}</strong></div>
                  <div><span>Total Penjualan</span><strong>{formatRupiah(sale.grandTotal)}</strong></div>
                  <div><span>Pembayaran</span><strong>{sale.paymentMethod}</strong></div>
                </div>
              </Panel>

              <Panel title="3. Pilih Item Refund">
                <RefundLineSelector
                  lines={sale.lines}
                  selections={selections}
                  onQtyChange={handleQtyChange}
                />
              </Panel>

              <Panel title="4. Konfirmasi Refund">
                <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
                  <FormField label="Outlet">
                    <select value={outletId} onChange={(e) => setOutletId(e.target.value)} required>
                      {formData.outlets.map((o) => (
                        <option key={o.id} value={o.id}>{o.outletName}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Kasir">
                    <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                      {formData.users.map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <RefundReasonField reason={reason} onReasonChange={setReason} />
                <PaymentForm
                  paymentMethod={refundMethod}
                  paidAmount=""
                  changeAmount={0}
                  grandTotal={totalRefund}
                  onPaymentMethodChange={setRefundMethod}
                  onPaidAmountChange={() => {}}
                  layout="grid"
                  methodLabel="Metode Refund"
                  amountLabel=""
                  showChange={false}
                />
                <div className="pos-refund-total">
                  <span>Total Refund</span>
                  <strong>{formatRupiah(totalRefund)}</strong>
                </div>
                <div className="ui-actions-row">
                  <Button variant="secondary" type="button" onClick={() => setSale(null)}>
                    Batal
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting || totalRefund <= 0}>
                    {submitting ? 'Menyimpan...' : 'Proses Refund'}
                  </Button>
                </div>
              </Panel>
            </>
          )}
        </form>
      )}

      <RefundDetailModal
        open={detailLoading || !!detail}
        onClose={() => { setDetail(null); setDetailLoading(false) }}
        loading={detailLoading}
        detail={detail}
      />
    </PageShell>
  )
}
