import { useCallback, useEffect, useState } from 'react'
import { salesApi } from '../../api/sales'
import { formatRupiah } from '../../api/dashboard'
import '../../styles/sales.css'

const PAYMENT_METHODS = ['', 'Cash', 'QRIS', 'Transfer', 'Debit', 'Credit']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartStr() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SalesRiwayat() {
  const [formData, setFormData] = useState(null)
  const [history, setHistory] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const [dateFrom, setDateFrom] = useState(monthStartStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [outletId, setOutletId] = useState('')
  const [userId, setUserId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const loadHistory = useCallback(async (filters) => {
    setLoading(true)
    setError('')
    try {
      const data = await salesApi.getHistory({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        invoiceNumber: filters.invoiceNumber || undefined,
        customerId: filters.customerId || undefined,
        outletId: filters.outletId || undefined,
        userId: filters.userId || undefined,
        paymentMethod: filters.paymentMethod || undefined,
      })
      setHistory(data)
    } catch (err) {
      setError(err.message)
      setHistory(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const fd = await salesApi.getFormData()
        if (cancelled) return
        setFormData(fd)
        await loadHistory({
          dateFrom: monthStartStr(),
          dateTo: todayStr(),
        })
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
    init()
    return () => { cancelled = true }
  }, [loadHistory])

  const handleFilter = (e) => {
    e.preventDefault()
    loadHistory({
      dateFrom,
      dateTo,
      invoiceNumber,
      customerId,
      outletId,
      userId,
      paymentMethod,
    })
  }

  const handleReset = () => {
    setDateFrom(monthStartStr())
    setDateTo(todayStr())
    setInvoiceNumber('')
    setCustomerId('')
    setOutletId('')
    setUserId('')
    setPaymentMethod('')
    loadHistory({ dateFrom: monthStartStr(), dateTo: todayStr() })
  }

  const openDetail = async (id) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const data = await salesApi.getTransaction(id)
      setDetail(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => setDetail(null)

  return (
    <div className="sales-page riwayat-page">
      <div className="sales-page-header">
        <h1>Riwayat Transaksi</h1>
        <p>Data dari tabel SalesTransactions & SalesTransactionDetails</p>
      </div>

      {error && <div className="sales-alert sales-alert-error">{error}</div>}

      <form className="riwayat-filters" onSubmit={handleFilter}>
        <div className="riwayat-filters-grid">
          <label>
            Dari Tanggal
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            Sampai Tanggal
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <label>
            No. Invoice
            <input
              type="text"
              placeholder="INV-..."
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </label>
          <label>
            Pelanggan
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Semua</option>
              {formData?.customers.map((c) => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </select>
          </label>
          <label>
            Outlet
            <select value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              <option value="">Semua</option>
              {formData?.outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.outletName}</option>
              ))}
            </select>
          </label>
          <label>
            Kasir
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Semua</option>
              {formData?.users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </label>
          <label>
            Pembayaran
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m || 'all'} value={m}>{m || 'Semua'}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="riwayat-filter-actions">
          <button type="button" className="sales-btn-secondary" onClick={handleReset}>
            Reset
          </button>
          <button type="submit" className="sales-btn-primary">
            Cari
          </button>
        </div>
      </form>

      {history && (
        <div className="riwayat-summary">
          <div className="riwayat-summary-card">
            <span>Total Transaksi</span>
            <strong>{history.totalCount}</strong>
          </div>
          <div className="riwayat-summary-card">
            <span>Total Penjualan</span>
            <strong>{formatRupiah(history.totalGrandTotal)}</strong>
          </div>
        </div>
      )}

      <div className="riwayat-table-panel">
        {loading ? (
          <div className="sales-loading">Memuat riwayat...</div>
        ) : (
          <div className="riwayat-table-wrap">
            <table className="riwayat-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>Outlet</th>
                  <th>Kasir</th>
                  <th>Item</th>
                  <th>Total</th>
                  <th>Bayar</th>
                  <th>Metode</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!history?.transactions?.length ? (
                  <tr>
                    <td colSpan={10} className="sales-cart-empty">
                      Tidak ada transaksi untuk filter ini
                    </td>
                  </tr>
                ) : (
                  history.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="riwayat-invoice">{tx.invoiceNumber}</td>
                      <td>{formatDateTime(tx.transactionDate)}</td>
                      <td>{tx.customerName}</td>
                      <td>{tx.outletName}</td>
                      <td>{tx.cashierName}</td>
                      <td>{tx.itemCount}</td>
                      <td className="riwayat-amount">{formatRupiah(tx.grandTotal)}</td>
                      <td>{formatRupiah(tx.paidAmount)}</td>
                      <td>
                        <span className={`riwayat-badge riwayat-badge-${tx.paymentMethod?.toLowerCase()}`}>
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="riwayat-btn-detail"
                          onClick={() => openDetail(tx.id)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(detail || detailLoading) && (
        <div className="riwayat-modal-overlay" onClick={closeDetail} role="presentation">
          <div
            className="riwayat-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="riwayat-modal-title"
          >
            {detailLoading ? (
              <div className="sales-loading">Memuat detail...</div>
            ) : detail && (
              <>
                <div className="riwayat-modal-header">
                  <div>
                    <h2 id="riwayat-modal-title">{detail.invoiceNumber}</h2>
                    <p>{formatDateTime(detail.transactionDate)}</p>
                  </div>
                  <button type="button" className="riwayat-modal-close" onClick={closeDetail}>
                    ×
                  </button>
                </div>

                <div className="riwayat-modal-info">
                  <div><span>Pelanggan</span><strong>{detail.customerName}</strong></div>
                  {detail.customerPhone && (
                    <div><span>Telepon</span><strong>{detail.customerPhone}</strong></div>
                  )}
                  <div><span>Outlet</span><strong>{detail.outletName}</strong></div>
                  {detail.outletAddress && (
                    <div><span>Alamat Outlet</span><strong>{detail.outletAddress}</strong></div>
                  )}
                  <div><span>Kasir</span><strong>{detail.cashierName} ({detail.cashierUsername})</strong></div>
                  <div><span>Pembayaran</span><strong>{detail.paymentMethod}</strong></div>
                </div>

                <table className="riwayat-detail-table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Produk</th>
                      <th>Qty</th>
                      <th>Harga</th>
                      <th>Diskon</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={item.detailId}>
                        <td>{item.productCode}</td>
                        <td>
                          {item.productName}
                          {item.unit && <span className="riwayat-unit"> ({item.unit})</span>}
                        </td>
                        <td>{item.qty}</td>
                        <td>{formatRupiah(item.price)}</td>
                        <td>{formatRupiah(item.discount)}</td>
                        <td>{formatRupiah(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="riwayat-modal-totals">
                  <div><span>Subtotal</span><strong>{formatRupiah(detail.subTotal)}</strong></div>
                  <div><span>Diskon</span><strong>{formatRupiah(detail.discount)}</strong></div>
                  <div><span>Pajak</span><strong>{formatRupiah(detail.tax)}</strong></div>
                  <div className="riwayat-grand"><span>Grand Total</span><strong>{formatRupiah(detail.grandTotal)}</strong></div>
                  <div><span>Dibayar</span><strong>{formatRupiah(detail.paidAmount)}</strong></div>
                  <div><span>Kembalian</span><strong>{formatRupiah(detail.changeAmount)}</strong></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
