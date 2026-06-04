import { useCallback, useEffect, useMemo, useState } from 'react'
import { salesApi } from '../../api/sales'
import { getStoredUser } from '../../api/auth'
import Button from '../../components/ui/Button'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import {
  PaymentBadge,
  TransactionFilters,
} from '../../components/pos'
import { useSalesFormData } from '../../hooks/useSalesFormData'
import { todayStr, monthStartStr } from '../../utils/date'
import { formatDateTime, formatRupiah } from '../../utils/format'
import {
  computePaymentBreakdown,
  computeSalesReportSummary,
  formatFilterSummary,
  formatReportDate,
  formatReportDateTime,
} from '../../utils/salesReport'
import { exportSalesReportPdf } from '../../utils/salesReportPdf'

function printReport() {
  document.body.classList.add('report-print-mode')
  window.print()
  window.addEventListener(
    'afterprint',
    () => document.body.classList.remove('report-print-mode'),
    { once: true },
  )
}

export default function LaporanPenjualan() {
  const { formData, loading: formLoading, error: formError } = useSalesFormData()
  const [history, setHistory] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const [filters, setFilters] = useState({
    dateFrom: monthStartStr(),
    dateTo: todayStr(),
    invoiceNumber: '',
    customerId: '',
    outletId: '',
    userId: '',
    paymentMethod: '',
  })

  const user = getStoredUser()

  const loadHistory = useCallback(async (f) => {
    setListLoading(true)
    setError('')
    try {
      const data = await salesApi.getHistory({
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        invoiceNumber: f.invoiceNumber || undefined,
        customerId: f.customerId || undefined,
        outletId: f.outletId || undefined,
        userId: f.userId || undefined,
        paymentMethod: f.paymentMethod || undefined,
      })
      setHistory(data)
    } catch (err) {
      setError(err.message)
      setHistory(null)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!formLoading && formData) {
      loadHistory({ dateFrom: monthStartStr(), dateTo: todayStr() })
    }
  }, [formLoading, formData, loadHistory])

  const transactions = history?.transactions ?? []
  const summary = useMemo(() => computeSalesReportSummary(transactions), [transactions])
  const paymentBreakdown = useMemo(() => computePaymentBreakdown(transactions), [transactions])
  const filterSummary = useMemo(
    () => formatFilterSummary(filters, formData),
    [filters, formData],
  )

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    loadHistory(filters)
  }

  const handleFilterReset = () => {
    const reset = {
      dateFrom: monthStartStr(),
      dateTo: todayStr(),
      invoiceNumber: '',
      customerId: '',
      outletId: '',
      userId: '',
      paymentMethod: '',
    }
    setFilters(reset)
    loadHistory(reset)
  }

  const handleExportPdf = async () => {
    if (!history) return
    setExporting(true)
    try {
      exportSalesReportPdf({
        history,
        filters,
        formData,
        printedBy: user?.fullName,
      })
    } catch (err) {
      setError(err.message || 'Gagal mengekspor PDF')
    } finally {
      setExporting(false)
    }
  }

  const loading = formLoading || (listLoading && !history)
  const hasData = transactions.length > 0

  const toolbar = (
    <div className="report-toolbar report-no-print">
      <Button
        variant="secondary"
        type="button"
        className="ui-btn-outline"
        onClick={printReport}
        disabled={!hasData || loading}
      >
        Cetak
      </Button>
      <Button
        variant="primary"
        type="button"
        onClick={handleExportPdf}
        disabled={!hasData || loading || exporting}
      >
        {exporting ? 'Mengekspor...' : 'Export PDF'}
      </Button>
    </div>
  )

  return (
    <PageShell
      title="Laporan Penjualan"
      description="Ringkasan dan detail transaksi dari SalesTransactions & SalesTransactionDetails"
      loading={loading}
      loadingMessage="Memuat laporan..."
      error={formError}
      errorHint="Pastikan database POS sudah diinisialisasi."
    >
      {error && <div className="ui-alert ui-alert-error report-no-print">{error}</div>}

      {formData && (
        <>
          <div className="report-no-print">
            <TransactionFilters
              formData={formData}
              {...filters}
              onChange={handleFilterChange}
              onSubmit={handleFilterSubmit}
              onReset={handleFilterReset}
            />
            {toolbar}
          </div>

          <div id="report-print-root">
            <article className="report-document" aria-label="Laporan penjualan">
              <header className="report-letterhead">
                <h2>LatihanASP POS</h2>
                <h3>LAPORAN PENJUALAN</h3>
                <p>
                  Periode: {formatReportDate(filters.dateFrom)} — {formatReportDate(filters.dateTo)}
                </p>
                <p>Filter: {filterSummary}</p>
                <p>
                  Dicetak: {formatReportDateTime()} · Oleh: {user?.fullName || '-'}
                </p>
              </header>

              <dl className="report-meta-grid">
                <div>
                  <dt>Total Transaksi</dt>
                  <dd>{summary.count} transaksi</dd>
                </div>
                <div>
                  <dt>Sumber Data</dt>
                  <dd>SalesTransactions, SalesTransactionDetails</dd>
                </div>
                <div>
                  <dt>Total Penjualan (API)</dt>
                  <dd>{formatRupiah(history?.totalGrandTotal ?? summary.grandTotal)}</dd>
                </div>
              </dl>

              <section aria-labelledby="report-summary-heading">
                <h4 id="report-summary-heading" className="report-section-title">
                  Ringkasan Keuangan
                </h4>
                <div className="report-summary-row">
                  <div className="report-summary-box">
                    <span>Subtotal</span>
                    <strong>{formatRupiah(summary.subTotal)}</strong>
                  </div>
                  <div className="report-summary-box">
                    <span>Diskon</span>
                    <strong>{formatRupiah(summary.discount)}</strong>
                  </div>
                  <div className="report-summary-box">
                    <span>Pajak</span>
                    <strong>{formatRupiah(summary.tax)}</strong>
                  </div>
                  <div className="report-summary-box report-summary-highlight">
                    <span>Total Penjualan</span>
                    <strong>{formatRupiah(summary.grandTotal)}</strong>
                  </div>
                </div>
              </section>

              {paymentBreakdown.length > 0 && (
                <section aria-labelledby="report-payment-heading">
                  <h4 id="report-payment-heading" className="report-section-title">
                    Rekap Metode Pembayaran
                  </h4>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Metode Pembayaran</th>
                          <th className="num">Jumlah Transaksi</th>
                          <th className="num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentBreakdown.map((row) => (
                          <tr key={row.method}>
                            <td>{row.method}</td>
                            <td className="num">{row.count}</td>
                            <td className="num">{formatRupiah(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td className="num">{summary.count}</td>
                          <td className="num">{formatRupiah(summary.grandTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )}

              <section aria-labelledby="report-detail-heading">
                <h4 id="report-detail-heading" className="report-section-title">
                  Detail Transaksi
                </h4>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Invoice</th>
                        <th>Tanggal</th>
                        <th>Pelanggan</th>
                        <th>Outlet</th>
                        <th>Kasir</th>
                        <th className="num">Item</th>
                        <th className="num">Subtotal</th>
                        <th className="num">Diskon</th>
                        <th className="num">Pajak</th>
                        <th className="num">Total</th>
                        <th className="num">Bayar</th>
                        <th className="num">Kembali</th>
                        <th>Metode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!hasData ? (
                        <tr>
                          <td colSpan={14} style={{ textAlign: 'center', padding: '1.5rem' }}>
                            Tidak ada transaksi untuk periode dan filter ini
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx, index) => (
                          <tr key={tx.id}>
                            <td>{index + 1}</td>
                            <td>{tx.invoiceNumber}</td>
                            <td>{formatDateTime(tx.transactionDate)}</td>
                            <td>{tx.customerName}</td>
                            <td>{tx.outletName}</td>
                            <td>{tx.cashierName}</td>
                            <td className="num">{tx.itemCount}</td>
                            <td className="num">{formatRupiah(tx.subTotal)}</td>
                            <td className="num">{formatRupiah(tx.discount)}</td>
                            <td className="num">{formatRupiah(tx.tax)}</td>
                            <td className="num">{formatRupiah(tx.grandTotal)}</td>
                            <td className="num">{formatRupiah(tx.paidAmount)}</td>
                            <td className="num">{formatRupiah(tx.changeAmount)}</td>
                            <td>
                              <PaymentBadge method={tx.paymentMethod} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {hasData && (
                      <tfoot>
                        <tr>
                          <td colSpan={7}>Jumlah ({summary.count} transaksi)</td>
                          <td className="num">{formatRupiah(summary.subTotal)}</td>
                          <td className="num">{formatRupiah(summary.discount)}</td>
                          <td className="num">{formatRupiah(summary.tax)}</td>
                          <td className="num">{formatRupiah(summary.grandTotal)}</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </section>

              <footer className="report-footer-note">
                Dokumen ini dibuat otomatis dari sistem POS LatihanASP.
                Kolom sesuai struktur database: InvoiceNumber, TransactionDate, SubTotal,
                Discount, Tax, GrandTotal, PaymentMethod, PaidAmount, ChangeAmount.
              </footer>
            </article>
          </div>

          {!loading && !hasData && (
            <Panel className="report-no-print">
              <p style={{ margin: 0, color: '#888' }}>
                Atur filter periode lalu klik Cari untuk menampilkan laporan.
              </p>
            </Panel>
          )}
        </>
      )}
    </PageShell>
  )
}
