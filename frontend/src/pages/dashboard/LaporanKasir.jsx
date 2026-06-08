import { useCallback, useEffect, useMemo, useState } from 'react'
import { shiftsApi } from '../../api/shifts'
import { getStoredUser } from '../../api/auth'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import { PaymentBadge } from '../../components/pos'
import { todayStr, monthStartStr } from '../../utils/date'
import { formatDateTime, formatRupiah } from '../../utils/format'
import { exportCashierReportPdf } from '../../utils/cashierReportPdf'
import {
  computeCashierReportSummary,
  formatCashierFilterSummary,
  formatReportDate,
  formatReportDateTime,
  formatVariance,
} from '../../utils/cashierReport'

function printReport() {
  document.body.classList.add('report-print-mode')
  window.print()
  window.addEventListener(
    'afterprint',
    () => document.body.classList.remove('report-print-mode'),
    { once: true },
  )
}

const emptyFilters = {
  dateFrom: monthStartStr(),
  dateTo: todayStr(),
  userId: '',
  shiftStatus: '',
}

export default function LaporanKasir() {
  const [formData, setFormData] = useState(null)
  const [report, setReport] = useState(null)
  const [filters, setFilters] = useState(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const user = getStoredUser()

  const loadReport = useCallback(async (f) => {
    setLoading(true)
    setError('')
    try {
      const [fd, data] = await Promise.all([
        shiftsApi.getFormData(),
        shiftsApi.getReport({
          dateFrom: f.dateFrom,
          dateTo: f.dateTo,
          userId: f.userId || undefined,
          shiftStatus: f.shiftStatus || undefined,
        }),
      ])
      setFormData(fd)
      setReport(data)
    } catch (err) {
      setError(err.message)
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReport(emptyFilters)
  }, [loadReport])

  const shifts = report?.shifts ?? []
  const transactions = report?.transactions ?? []
  const paymentBreakdown = report?.paymentBreakdown ?? []
  const cashierSummaries = report?.cashierSummaries ?? []
  const summary = useMemo(() => computeCashierReportSummary(report), [report])
  const filterSummary = useMemo(
    () => formatCashierFilterSummary(filters, formData),
    [filters, formData],
  )

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    loadReport(filters)
  }

  const handleFilterReset = () => {
    setFilters(emptyFilters)
    loadReport(emptyFilters)
  }

  const handleExportPdf = async () => {
    if (!report) return
    setExporting(true)
    try {
      exportCashierReportPdf({
        report,
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

  const hasData = shifts.length > 0 || transactions.length > 0

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
      title="Laporan Kasir"
      description="Rekapitulasi shift kasir, penjualan per shift, dan rekonsiliasi kas dari CashierShifts & SalesTransactions"
      loading={loading && !report}
      loadingMessage="Memuat laporan kasir..."
      error={!formData && !loading ? error : ''}
      errorHint="Pastikan database POS sudah diinisialisasi."
    >
      {error && <div className="ui-alert ui-alert-error report-no-print">{error}</div>}

      {formData && (
        <>
          <Panel className="report-no-print pos-filters" title="Filter Laporan">
            <form className="pos-filter-form" onSubmit={handleFilterSubmit}>
              <div className="pos-filter-grid">
                <FormField label="Dari Tanggal">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </FormField>
                <FormField label="Sampai Tanggal">
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </FormField>
                <FormField label="Kasir">
                  <select
                    value={filters.userId}
                    onChange={(e) => handleFilterChange('userId', e.target.value)}
                  >
                    <option value="">Semua kasir</option>
                    {formData.users?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.username})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Status Shift">
                  <select
                    value={filters.shiftStatus}
                    onChange={(e) => handleFilterChange('shiftStatus', e.target.value)}
                  >
                    <option value="">Semua</option>
                    <option value="open">Shift aktif</option>
                    <option value="closed">Shift tertutup</option>
                  </select>
                </FormField>
              </div>
              <div className="pos-filter-actions">
                <Button type="submit" variant="primary" disabled={loading}>
                  Cari
                </Button>
                <Button type="button" variant="secondary" onClick={handleFilterReset}>
                  Reset
                </Button>
              </div>
            </form>
          </Panel>

          {toolbar}

          <div id="report-print-root">
            <article className="report-document" aria-label="Laporan kasir">
              <header className="report-letterhead">
                <h2>ERP Point Of Sale</h2>
                <h3>LAPORAN KASIR</h3>
                <p>
                  Periode shift: {formatReportDate(filters.dateFrom)} —{' '}
                  {formatReportDate(filters.dateTo)}
                </p>
                <p>Filter: {filterSummary}</p>
                <p>
                  Dicetak: {formatReportDateTime()} · Oleh: {user?.fullName || '-'}
                </p>
              </header>

              <dl className="report-meta-grid">
                <div>
                  <dt>Total Shift</dt>
                  <dd>
                    {summary.shiftCount} shift ({summary.openShiftCount} aktif)
                  </dd>
                </div>
                <div>
                  <dt>Sumber Data</dt>
                  <dd>CashierShifts, SalesTransactions</dd>
                </div>
                <div>
                  <dt>Total Penjualan</dt>
                  <dd>{formatRupiah(report?.totalSales ?? summary.totalSales)}</dd>
                </div>
              </dl>

              <section aria-labelledby="report-cashier-summary-heading">
                <h4 id="report-cashier-summary-heading" className="report-section-title">
                  Ringkasan Operasional
                </h4>
                <div className="report-summary-row">
                  <div className="report-summary-box">
                    <span>Transaksi</span>
                    <strong>{summary.transactionCount}</strong>
                  </div>
                  <div className="report-summary-box">
                    <span>Penjualan Tunai</span>
                    <strong>{formatRupiah(summary.cashSales)}</strong>
                  </div>
                  <div className="report-summary-box">
                    <span>Penjualan Non-Tunai</span>
                    <strong>{formatRupiah(summary.nonCashSales)}</strong>
                  </div>
                  <div className="report-summary-box report-summary-highlight">
                    <span>Total Penjualan</span>
                    <strong>{formatRupiah(summary.totalSales)}</strong>
                  </div>
                </div>
              </section>

              {cashierSummaries.length > 0 && (
                <section aria-labelledby="report-per-kasir-heading">
                  <h4 id="report-per-kasir-heading" className="report-section-title">
                    Rekap per Kasir
                  </h4>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Kasir</th>
                          <th className="num">Jumlah Shift</th>
                          <th className="num">Transaksi</th>
                          <th className="num">Total Penjualan</th>
                          <th className="num">Tunai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashierSummaries.map((row) => (
                          <tr key={row.userId}>
                            <td>{row.cashierName}</td>
                            <td className="num">{row.shiftCount}</td>
                            <td className="num">{row.transactionCount}</td>
                            <td className="num">{formatRupiah(row.totalSales)}</td>
                            <td className="num">{formatRupiah(row.cashSales)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

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
                          <tr key={row.paymentMethod}>
                            <td>{row.paymentMethod}</td>
                            <td className="num">{row.transactionCount}</td>
                            <td className="num">{formatRupiah(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td className="num">{summary.transactionCount}</td>
                          <td className="num">{formatRupiah(summary.totalSales)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )}

              <section aria-labelledby="report-shift-heading">
                <h4 id="report-shift-heading" className="report-section-title">
                  Detail Shift Kasir
                </h4>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Kasir</th>
                        <th>Waktu Buka</th>
                        <th>Waktu Tutup</th>
                        <th className="num">Kas Awal</th>
                        <th className="num">Kas Tutup</th>
                        <th className="num">Trx</th>
                        <th className="num">Penjualan</th>
                        <th className="num">Tunai</th>
                        <th className="num">Non-Tunai</th>
                        <th className="num">Ekspektasi Kas</th>
                        <th className="num">Selisih</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!shifts.length ? (
                        <tr>
                          <td colSpan={13} style={{ textAlign: 'center', padding: '1.5rem' }}>
                            Tidak ada shift kasir untuk periode dan filter ini
                          </td>
                        </tr>
                      ) : (
                        shifts.map((s, index) => (
                          <tr key={s.shiftId}>
                            <td>{index + 1}</td>
                            <td>
                              {s.cashierName}
                              <br />
                              <small style={{ color: '#888' }}>{s.username}</small>
                            </td>
                            <td>{formatDateTime(s.openTime)}</td>
                            <td>{s.closeTime ? formatDateTime(s.closeTime) : '—'}</td>
                            <td className="num">
                              {s.openingCash != null ? formatRupiah(s.openingCash) : '—'}
                            </td>
                            <td className="num">
                              {s.closingCash != null ? formatRupiah(s.closingCash) : '—'}
                            </td>
                            <td className="num">{s.transactionCount}</td>
                            <td className="num">{formatRupiah(s.totalSales)}</td>
                            <td className="num">{formatRupiah(s.cashSales)}</td>
                            <td className="num">{formatRupiah(s.nonCashSales)}</td>
                            <td className="num">
                              {s.expectedClosingCash != null
                                ? formatRupiah(s.expectedClosingCash)
                                : '—'}
                            </td>
                            <td
                              className={`num${s.cashVariance != null && s.cashVariance !== 0 ? ' report-variance-warn' : ''}`}
                            >
                              {formatVariance(s.cashVariance)}
                            </td>
                            <td>{s.isOpen ? 'Aktif' : 'Tutup'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section aria-labelledby="report-tx-heading">
                <h4 id="report-tx-heading" className="report-section-title">
                  Detail Transaksi dalam Shift
                </h4>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Shift ID</th>
                        <th>Invoice</th>
                        <th>Tanggal</th>
                        <th>Kasir</th>
                        <th>Pelanggan</th>
                        <th>Outlet</th>
                        <th className="num">Item</th>
                        <th className="num">Subtotal</th>
                        <th className="num">Diskon</th>
                        <th className="num">Pajak</th>
                        <th className="num">Total</th>
                        <th className="num">Bayar</th>
                        <th>Metode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!transactions.length ? (
                        <tr>
                          <td colSpan={14} style={{ textAlign: 'center', padding: '1.5rem' }}>
                            Tidak ada transaksi penjualan pada shift terfilter
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx, index) => (
                          <tr key={`${tx.shiftId}-${tx.id}`}>
                            <td>{index + 1}</td>
                            <td>{tx.shiftId}</td>
                            <td>{tx.invoiceNumber}</td>
                            <td>{formatDateTime(tx.transactionDate)}</td>
                            <td>{tx.cashierName}</td>
                            <td>{tx.customerName}</td>
                            <td>{tx.outletName}</td>
                            <td className="num">{tx.itemCount}</td>
                            <td className="num">{formatRupiah(tx.subTotal)}</td>
                            <td className="num">{formatRupiah(tx.discount)}</td>
                            <td className="num">{formatRupiah(tx.tax)}</td>
                            <td className="num">{formatRupiah(tx.grandTotal)}</td>
                            <td className="num">{formatRupiah(tx.paidAmount)}</td>
                            <td>
                              <PaymentBadge method={tx.paymentMethod} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <footer className="report-footer-note">
                Dokumen ini dibuat otomatis dari sistem ERP Point Of Sale. Kolom shift sesuai
                CashierShifts (OpenTime, CloseTime, OpeningCash, ClosingCash). Penjualan
                dihitung dari SalesTransactions dalam rentang waktu shift. Ekspektasi kas =
                OpeningCash + penjualan tunai; selisih = ClosingCash − ekspektasi.
              </footer>
            </article>
          </div>

          {!loading && !hasData && (
            <Panel className="report-no-print">
              <p style={{ margin: 0, color: '#888' }}>
                Atur filter periode shift lalu klik Cari. Pastikan shift kasir sudah dibuka di
                menu Karyawan &amp; User → Shift Kasir.
              </p>
            </Panel>
          )}
        </>
      )}
    </PageShell>
  )
}
