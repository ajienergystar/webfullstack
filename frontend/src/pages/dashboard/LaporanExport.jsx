import { useCallback, useEffect, useMemo, useState } from 'react'
import { getStoredUser } from '../../api/auth'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import { useSalesFormData } from '../../hooks/useSalesFormData'
import { todayStr, monthStartStr } from '../../utils/date'
import { formatDateTime, formatRupiah } from '../../utils/format'
import { formatSignedRupiah } from '../../utils/financeReport'
import { exportConsolidatedReportPdf } from '../../utils/exportReportPdf'
import {
  DEFAULT_EXPORT_MODULES,
  EXPORT_MODULE_OPTIONS,
  executiveSummaryRows,
  exportHasData,
  fetchExportReportData,
  formatExportFilterSummary,
  formatModulesSummary,
  formatReportDate,
  formatReportDateTime,
} from '../../utils/exportReport'

function printReport() {
  document.body.classList.add('report-print-mode', 'report-print-export')
  window.print()
  window.addEventListener(
    'afterprint',
    () => document.body.classList.remove('report-print-mode', 'report-print-export'),
    { once: true },
  )
}

const defaultFilters = {
  dateFrom: monthStartStr(),
  dateTo: todayStr(),
  outletId: '',
}

export default function LaporanExport() {
  const { formData, loading: formLoading, error: formError } = useSalesFormData()
  const [snapshot, setSnapshot] = useState(null)
  const [filters, setFilters] = useState(defaultFilters)
  const [modules, setModules] = useState({ ...DEFAULT_EXPORT_MODULES })
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const user = getStoredUser()

  const loadReport = useCallback(async (f, mod = DEFAULT_EXPORT_MODULES) => {
    const active = Object.values(mod ?? DEFAULT_EXPORT_MODULES).some(Boolean)
    if (!active) {
      setError('Pilih minimal satu modul laporan.')
      setSnapshot(null)
      return
    }

    setListLoading(true)
    setError('')
    try {
      const data = await fetchExportReportData(f, mod)
      setSnapshot(data)
    } catch (err) {
      setError(err.message)
      setSnapshot(null)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (formLoading) return
    if (formData) {
      loadReport(defaultFilters, DEFAULT_EXPORT_MODULES)
    } else {
      setListLoading(false)
    }
  }, [formLoading, formData, loadReport])

  const filterSummary = useMemo(
    () => formatExportFilterSummary(filters, formData),
    [filters, formData],
  )

  const modulesSummary = useMemo(() => formatModulesSummary(modules), [modules])
  const execRows = useMemo(
    () => (snapshot ? executiveSummaryRows(snapshot) : []),
    [snapshot],
  )
  const hasData = exportHasData(snapshot)
  const loading = formLoading

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleModuleToggle = (id) => {
    setModules((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    loadReport(filters, modules)
  }

  const handleFilterReset = () => {
    setFilters(defaultFilters)
    setModules({ ...DEFAULT_EXPORT_MODULES })
    loadReport(defaultFilters, DEFAULT_EXPORT_MODULES)
  }

  const handleExportPdf = async () => {
    if (!snapshot) return
    setExporting(true)
    try {
      exportConsolidatedReportPdf({
        snapshot,
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
      title="Laporan Export"
      description="Ringkasan gabungan POS dari database — cetak ke printer atau unduh PDF"
      loading={loading}
      loadingMessage="Memuat laporan..."
      error={formError}
      errorHint="Pastikan database POS sudah diinisialisasi."
    >
      {error && <div className="ui-alert ui-alert-error report-no-print">{error}</div>}

      {formData && (
        <>
          <Panel className="report-no-print export-filter-panel">
            <form onSubmit={handleFilterSubmit} className="export-filter-form">
              <div className="export-filter-grid">
                <FormField label="Dari Tanggal">
                  <input
                    type="date"
                    className="ui-input"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </FormField>
                <FormField label="Sampai Tanggal">
                  <input
                    type="date"
                    className="ui-input"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </FormField>
                <FormField label="Outlet">
                  <select
                    className="ui-input"
                    value={filters.outletId}
                    onChange={(e) => handleFilterChange('outletId', e.target.value)}
                  >
                    <option value="">Semua outlet</option>
                    {(formData.outlets ?? []).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.outletName}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <fieldset className="export-module-fieldset">
                <legend>Modul yang disertakan</legend>
                <div className="export-module-checkboxes">
                  {EXPORT_MODULE_OPTIONS.map((opt) => (
                    <label key={opt.id} className="export-module-label">
                      <input
                        type="checkbox"
                        checked={!!modules[opt.id]}
                        onChange={() => handleModuleToggle(opt.id)}
                      />
                      <span>
                        <strong>{opt.label}</strong>
                        <small>{opt.source}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="export-filter-actions">
                <Button type="submit" variant="primary" disabled={listLoading}>
                  {listLoading ? 'Memuat data...' : 'Tampilkan Laporan'}
                </Button>
                {listLoading && (
                  <span className="export-loading-hint">Mengambil data dari server...</span>
                )}
                <Button type="button" variant="secondary" onClick={handleFilterReset}>
                  Reset
                </Button>
              </div>
            </form>
            {toolbar}
          </Panel>

          <div id="report-print-root">
            <article className="report-document" aria-label="Laporan export gabungan">
              <header className="report-letterhead">
                <h2>ERP Point Of Sale</h2>
                <h3>LAPORAN EKSPOR / RINGKASAN POS</h3>
                <p>
                  Periode: {formatReportDate(filters.dateFrom)} — {formatReportDate(filters.dateTo)}
                </p>
                <p>Filter: {filterSummary}</p>
                <p>Modul: {modulesSummary}</p>
                <p>
                  Dicetak: {formatReportDateTime()} · Oleh: {user?.fullName || '-'}
                </p>
              </header>

              <dl className="report-meta-grid">
                <div>
                  <dt>Jenis Laporan</dt>
                  <dd>Ringkasan gabungan multi-modul</dd>
                </div>
                <div>
                  <dt>Sumber Data</dt>
                  <dd>API backend sesuai tabel database POS</dd>
                </div>
                <div>
                  <dt>Format Output</dt>
                  <dd>Cetak printer · PDF (A4 portrait)</dd>
                </div>
              </dl>

              {execRows.length > 0 && (
                <section aria-labelledby="export-exec-heading">
                  <h4 id="export-exec-heading" className="report-section-title">
                    Ringkasan Eksekutif
                  </h4>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Modul</th>
                          <th>Indikator Utama</th>
                          <th className="num">Nilai</th>
                          <th>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {execRows.map((row) => (
                          <tr key={`${row.modul}-${row.indikator}`}>
                            <td>{row.modul}</td>
                            <td>{row.indikator}</td>
                            <td className="num">{formatRupiah(row.nilai)}</td>
                            <td>{row.satuan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {snapshot?.penjualan && (
                <section aria-labelledby="export-sales-heading">
                  <h4 id="export-sales-heading" className="report-section-title">
                    Penjualan — SalesTransactions
                  </h4>
                  <div className="report-summary-row">
                    <div className="report-summary-box">
                      <span>Transaksi</span>
                      <strong>{snapshot.penjualan.summary.count}</strong>
                    </div>
                    <div className="report-summary-box">
                      <span>Subtotal</span>
                      <strong>{formatRupiah(snapshot.penjualan.summary.subTotal)}</strong>
                    </div>
                    <div className="report-summary-box">
                      <span>Diskon</span>
                      <strong>{formatRupiah(snapshot.penjualan.summary.discount)}</strong>
                    </div>
                    <div className="report-summary-box report-summary-highlight">
                      <span>GrandTotal</span>
                      <strong>{formatRupiah(snapshot.penjualan.summary.grandTotal)}</strong>
                    </div>
                  </div>
                  {(snapshot.penjualan.payments ?? []).length > 0 && (
                    <div className="report-table-wrap">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>PaymentMethod</th>
                            <th className="num">Trx</th>
                            <th className="num">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.penjualan.payments.map((p) => (
                            <tr key={p.method}>
                              <td>{p.method}</td>
                              <td className="num">{p.count}</td>
                              <td className="num">{formatRupiah(p.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {snapshot?.keuangan && (
                <section aria-labelledby="export-finance-heading">
                  <h4 id="export-finance-heading" className="report-section-title">
                    Keuangan — Laporan Laba Rugi
                  </h4>
                  <div className="report-table-wrap">
                    <table className="report-table report-pl-table">
                      <thead>
                        <tr>
                          <th>Posisi</th>
                          <th className="num">Jumlah (Rp)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshot.keuangan.incomeRows.map((row) => (
                          <tr
                            key={row.label}
                            className={
                              row.type === 'result'
                                ? 'report-pl-result'
                                : row.type === 'highlight'
                                  ? 'report-pl-highlight'
                                  : ''
                            }
                          >
                            <td>{row.label}</td>
                            <td className="num">{formatSignedRupiah(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {snapshot?.produk && (
                <section aria-labelledby="export-product-heading">
                  <h4 id="export-product-heading" className="report-section-title">
                    Produk — Products
                  </h4>
                  <div className="report-summary-row">
                    <div className="report-summary-box">
                      <span>SKU</span>
                      <strong>{snapshot.produk.summary.count}</strong>
                    </div>
                    <div className="report-summary-box">
                      <span>Total Stok</span>
                      <strong>{snapshot.produk.summary.totalStock}</strong>
                    </div>
                    <div className="report-summary-box">
                      <span>Nilai Beli</span>
                      <strong>{formatRupiah(snapshot.produk.summary.purchaseValue)}</strong>
                    </div>
                    <div className="report-summary-box report-summary-highlight">
                      <span>Nilai Jual</span>
                      <strong>{formatRupiah(snapshot.produk.summary.sellingValue)}</strong>
                    </div>
                  </div>
                </section>
              )}

              {snapshot?.inventory && (
                <section aria-labelledby="export-inv-heading">
                  <h4 id="export-inv-heading" className="report-section-title">
                    Inventory — Products &amp; StockMovements
                  </h4>
                  <div className="report-summary-row">
                    <div className="report-summary-box">
                      <span>Item</span>
                      <strong>{snapshot.inventory.summary.count}</strong>
                    </div>
                    <div className="report-summary-box">
                      <span>Stok Rendah (≤5)</span>
                      <strong>{snapshot.inventory.summary.lowStockCount}</strong>
                    </div>
                    <div className="report-summary-box report-summary-highlight">
                      <span>Nilai Persediaan</span>
                      <strong>{formatRupiah(snapshot.inventory.summary.sellingValue)}</strong>
                    </div>
                  </div>
                  {(snapshot.inventory.lowStock ?? []).length > 0 && (
                    <>
                      <p className="report-subsection-label">Produk stok rendah</p>
                      <div className="report-table-wrap">
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>ProductName</th>
                              <th>SKU</th>
                              <th className="num">Stock</th>
                              <th className="num">SellingPrice</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snapshot.inventory.lowStock.map((p) => (
                              <tr key={p.id}>
                                <td>{p.productName}</td>
                                <td>{p.sku || '-'}</td>
                                <td className="num">{p.stock}</td>
                                <td className="num">{formatRupiah(p.sellingPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              )}

              {snapshot?.kasir && (
                <section aria-labelledby="export-cashier-heading">
                  <h4 id="export-cashier-heading" className="report-section-title">
                    Kasir — CashierShifts
                  </h4>
                  <div className="report-summary-row">
                    <div className="report-summary-box">
                      <span>Shift</span>
                      <strong>{snapshot.kasir.summary.shiftCount}</strong>
                    </div>
                    <div className="report-summary-box">
                      <span>Transaksi</span>
                      <strong>{snapshot.kasir.summary.transactionCount}</strong>
                    </div>
                    <div className="report-summary-box report-summary-highlight">
                      <span>Penjualan</span>
                      <strong>{formatRupiah(snapshot.kasir.summary.totalSales)}</strong>
                    </div>
                  </div>
                  {(snapshot.kasir.shifts ?? []).length > 0 && (
                    <div className="report-table-wrap">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Kasir</th>
                            <th>OpenTime</th>
                            <th>CloseTime</th>
                            <th className="num">Trx</th>
                            <th className="num">GrandTotal</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.kasir.shifts.map((s) => (
                            <tr key={s.id}>
                              <td>{s.cashierName}</td>
                              <td>{formatDateTime(s.openTime)}</td>
                              <td>{s.closeTime ? formatDateTime(s.closeTime) : '-'}</td>
                              <td className="num">{s.transactionCount}</td>
                              <td className="num">{formatRupiah(s.totalSales)}</td>
                              <td>{s.isOpen ? 'Aktif' : 'Tutup'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {!hasData && !loading && (
                <p className="report-empty-inline">
                  Tidak ada data untuk periode dan modul yang dipilih.
                </p>
              )}

              <footer className="report-footer-note">
                Laporan ini menggabungkan data dari modul Penjualan, Produk, Keuangan,
                Inventory, dan Kasir sesuai struktur tabel database ERP Point Of Sale.
                Gunakan tombol Cetak untuk printer atau Export PDF untuk file dokumen.
              </footer>
            </article>
          </div>

          {!loading && !hasData && (
            <Panel className="report-no-print">
              <p style={{ margin: 0, color: '#888' }}>
                Atur periode, pilih modul, lalu klik Tampilkan Laporan.
              </p>
            </Panel>
          )}
        </>
      )}
    </PageShell>
  )
}
