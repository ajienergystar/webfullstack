import { useCallback, useEffect, useMemo, useState } from 'react'
import { salesApi } from '../../api/sales'
import { expensesApi } from '../../api/expenses'
import { purchasesApi } from '../../api/purchases'
import { cashBankApi } from '../../api/cashBank'
import { refundApi } from '../../api/refund'
import { getStoredUser } from '../../api/auth'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import { useSalesFormData } from '../../hooks/useSalesFormData'
import { todayStr, monthStartStr } from '../../utils/date'
import { formatDateTime, formatRupiah } from '../../utils/format'
import { exportFinanceReportPdf } from '../../utils/financeReportPdf'
import {
  computeFinanceSummary,
  filterRefundsInRange,
  formatFinanceFilterSummary,
  formatReportDate,
  formatReportDateTime,
  formatSignedRupiah,
  incomeStatementRows,
  toIsoDateEnd,
  toIsoDateStart,
} from '../../utils/financeReport'

function printReport() {
  document.body.classList.add('report-print-mode', 'report-print-finance')
  window.print()
  window.addEventListener(
    'afterprint',
    () => document.body.classList.remove('report-print-mode', 'report-print-finance'),
    { once: true },
  )
}

export default function LaporanKeuangan() {
  const { formData, loading: formLoading, error: formError } = useSalesFormData()
  const [reportData, setReportData] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const [filters, setFilters] = useState({
    dateFrom: monthStartStr(),
    dateTo: todayStr(),
    outletId: '',
  })

  const user = getStoredUser()

  const loadReport = useCallback(async (f) => {
    setListLoading(true)
    setError('')
    try {
      const dateFromIso = toIsoDateStart(f.dateFrom)
      const dateToIso = toIsoDateEnd(f.dateTo)

      const [salesHistory, expenses, purchases, cashTransactions, refundList] =
        await Promise.all([
          salesApi.getHistory({
            dateFrom: f.dateFrom,
            dateTo: f.dateTo,
            outletId: f.outletId || undefined,
          }),
          expensesApi.list({ dateFrom: dateFromIso, dateTo: dateToIso }),
          purchasesApi.list({ dateFrom: dateFromIso, dateTo: dateToIso }),
          cashBankApi.listTransactions({ dateFrom: dateFromIso, dateTo: dateToIso }),
          refundApi.list(),
        ])

      const refunds = filterRefundsInRange(refundList.refunds, f.dateFrom, f.dateTo)

      setReportData({
        salesHistory,
        expenses,
        purchases,
        cashTransactions,
        refunds,
      })
    } catch (err) {
      setError(err.message)
      setReportData(null)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!formLoading && formData) {
      loadReport({ dateFrom: monthStartStr(), dateTo: todayStr(), outletId: '' })
    }
  }, [formLoading, formData, loadReport])

  const summary = useMemo(
    () =>
      reportData
        ? computeFinanceSummary(reportData)
        : null,
    [reportData],
  )

  const plRows = useMemo(
    () => (summary ? incomeStatementRows(summary) : []),
    [summary],
  )

  const filterSummary = useMemo(
    () => formatFinanceFilterSummary(filters, formData),
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
    const reset = { dateFrom: monthStartStr(), dateTo: todayStr(), outletId: '' }
    setFilters(reset)
    loadReport(reset)
  }

  const handleExportPdf = async () => {
    if (!reportData) return
    setExporting(true)
    try {
      exportFinanceReportPdf({
        reportData,
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

  const loading = formLoading || (listLoading && !reportData)
  const hasData = summary && (
    summary.sales.count > 0
    || summary.refunds.count > 0
    || summary.purchases.count > 0
    || summary.expenses.count > 0
    || summary.cash.count > 0
  )

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

  const expenses = reportData?.expenses?.expenses ?? []
  const purchases = reportData?.purchases?.purchases ?? []
  const refunds = reportData?.refunds ?? []
  const cashTx = reportData?.cashTransactions?.transactions ?? []

  return (
    <PageShell
      title="Laporan Keuangan"
      description="Laporan laba rugi dan arus kas dari SalesTransactions, Purchases, Expenses, Refunds, CashTransactions"
      loading={loading}
      loadingMessage="Memuat laporan keuangan..."
      error={formError}
      errorHint="Pastikan database POS sudah diinisialisasi."
    >
      {error && <div className="ui-alert ui-alert-error report-no-print">{error}</div>}

      {formData && (
        <>
          <Panel className="report-no-print pos-filters" title="Filter Laporan">
            <form onSubmit={handleFilterSubmit}>
              <div className="ui-form-grid ui-form-grid-3">
                <FormField label="Dari Tanggal">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Sampai Tanggal">
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Outlet">
                  <select
                    value={filters.outletId}
                    onChange={(e) => handleFilterChange('outletId', e.target.value)}
                  >
                    <option value="">Semua Outlet</option>
                    {formData.outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.outletName}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="ui-form-actions">
                <Button type="submit" variant="primary" disabled={listLoading}>
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
            <article className="report-document" aria-label="Laporan keuangan">
              <header className="report-letterhead">
                <h2>ERP Point Of Sale</h2>
                <h3>LAPORAN KEUANGAN</h3>
                <p>Laporan Laba Rugi &amp; Arus Kas</p>
                <p>
                  Periode: {formatReportDate(filters.dateFrom)} — {formatReportDate(filters.dateTo)}
                </p>
                <p>Filter: {filterSummary}</p>
                <p>
                  Dicetak: {formatReportDateTime()} · Oleh: {user?.fullName || '-'}
                </p>
              </header>

              {summary && (
                <>
                  <dl className="report-meta-grid">
                    <div>
                      <dt>Sumber Data</dt>
                      <dd>
                        SalesTransactions, Purchases, Expenses, Refunds, CashTransactions
                      </dd>
                    </div>
                    <div>
                      <dt>Transaksi Penjualan</dt>
                      <dd>{summary.sales.count} transaksi</dd>
                    </div>
                    <div>
                      <dt>Laba / Rugi Operasional</dt>
                      <dd className={summary.operatingProfit >= 0 ? 'report-amount-positive' : 'report-amount-negative'}>
                        {formatSignedRupiah(summary.operatingProfit)}
                      </dd>
                    </div>
                  </dl>

                  <section aria-labelledby="report-pl-heading">
                    <h4 id="report-pl-heading" className="report-section-title">
                      I. Laporan Laba Rugi
                    </h4>
                    <div className="report-table-wrap">
                      <table className="report-table report-pl-table">
                        <thead>
                          <tr>
                            <th>Pos</th>
                            <th className="num">Jumlah (Rp)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plRows.map((row) => (
                            <tr
                              key={row.label}
                              className={
                                row.type === 'highlight' || row.type === 'result'
                                  ? 'report-pl-row-total'
                                  : row.type === 'subtotal'
                                    ? 'report-pl-row-subtotal'
                                    : ''
                              }
                            >
                              <td>{row.label}</td>
                              <td className={`num ${row.amount < 0 ? 'report-amount-negative' : ''}`}>
                                {formatSignedRupiah(row.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section aria-labelledby="report-cash-heading">
                    <h4 id="report-cash-heading" className="report-section-title">
                      II. Arus Kas
                    </h4>
                    <div className="report-summary-row">
                      <div className="report-summary-box">
                        <span>Kas Masuk (IN)</span>
                        <strong>{formatRupiah(summary.cash.cashIn)}</strong>
                      </div>
                      <div className="report-summary-box">
                        <span>Kas Keluar (OUT)</span>
                        <strong>{formatRupiah(summary.cash.cashOut)}</strong>
                      </div>
                      <div className="report-summary-box report-summary-highlight">
                        <span>Net Arus Kas</span>
                        <strong>{formatRupiah(summary.cash.netFlow)}</strong>
                      </div>
                      <div className="report-summary-box">
                        <span>Transaksi Kas</span>
                        <strong>{summary.cash.count}</strong>
                      </div>
                    </div>
                  </section>

                  {refunds.length > 0 && (
                    <section aria-labelledby="report-refund-heading">
                      <h4 id="report-refund-heading" className="report-section-title">
                        III. Retur Penjualan (Refunds)
                      </h4>
                      <div className="report-table-wrap">
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>No. Refund</th>
                              <th>Tanggal</th>
                              <th>Invoice</th>
                              <th>Outlet</th>
                              <th className="num">Total Refund</th>
                              <th>Metode</th>
                            </tr>
                          </thead>
                          <tbody>
                            {refunds.map((r, i) => (
                              <tr key={r.id}>
                                <td>{i + 1}</td>
                                <td>{r.refundNumber}</td>
                                <td>{formatDateTime(r.refundDate)}</td>
                                <td>{r.invoiceNumber}</td>
                                <td>{r.outletName}</td>
                                <td className="num">{formatRupiah(r.totalRefund)}</td>
                                <td>{r.refundMethod}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={5}>Total ({summary.refunds.count} retur)</td>
                              <td className="num">{formatRupiah(summary.refunds.total)}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </section>
                  )}

                  {purchases.length > 0 && (
                    <section aria-labelledby="report-purchase-heading">
                      <h4 id="report-purchase-heading" className="report-section-title">
                        IV. Pembelian (Purchases)
                      </h4>
                      <div className="report-table-wrap">
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>Invoice</th>
                              <th>Tanggal</th>
                              <th>Supplier</th>
                              <th className="num">Item</th>
                              <th className="num">TotalAmount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchases.map((p, i) => (
                              <tr key={p.id}>
                                <td>{i + 1}</td>
                                <td>{p.invoiceNumber || '-'}</td>
                                <td>{formatDateTime(p.purchaseDate)}</td>
                                <td>{p.supplierName || '-'}</td>
                                <td className="num">{p.lineCount}</td>
                                <td className="num">{formatRupiah(p.totalAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={5}>
                                Jumlah ({summary.purchases.count} pembelian)
                              </td>
                              <td className="num">{formatRupiah(summary.purchases.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </section>
                  )}

                  {expenses.length > 0 && (
                    <section aria-labelledby="report-expense-heading">
                      <h4 id="report-expense-heading" className="report-section-title">
                        V. Pengeluaran Operasional (Expenses)
                      </h4>
                      <div className="report-table-wrap">
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>ExpenseName</th>
                              <th>ExpenseDate</th>
                              <th className="num">Amount</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses.map((e, i) => (
                              <tr key={e.id}>
                                <td>{i + 1}</td>
                                <td>{e.expenseName}</td>
                                <td>{formatDateTime(e.expenseDate)}</td>
                                <td className="num">{formatRupiah(e.amount)}</td>
                                <td>{e.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={3}>
                                Jumlah ({summary.expenses.count} pengeluaran)
                              </td>
                              <td className="num">{formatRupiah(summary.expenses.total)}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </section>
                  )}

                  {cashTx.length > 0 && (
                    <section aria-labelledby="report-cash-detail-heading">
                      <h4 id="report-cash-detail-heading" className="report-section-title">
                        VI. Detail Arus Kas (CashTransactions)
                      </h4>
                      <div className="report-table-wrap">
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>Rekening</th>
                              <th>Tipe</th>
                              <th>Tanggal</th>
                              <th className="num">Amount</th>
                              <th>Referensi</th>
                              <th>Keterangan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cashTx.map((tx, i) => (
                              <tr key={tx.id}>
                                <td>{i + 1}</td>
                                <td>
                                  {tx.accountCode} — {tx.accountName}
                                </td>
                                <td>{tx.transactionType}</td>
                                <td>{formatDateTime(tx.transactionDate)}</td>
                                <td className="num">{formatRupiah(tx.amount)}</td>
                                <td>{tx.referenceNumber || '-'}</td>
                                <td>{tx.description || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  <footer className="report-footer-note">
                    Dokumen ini dibuat otomatis dari sistem ERP Point Of Sale.
                    Kolom mengacu struktur database: GrandTotal, Tax, Discount (SalesTransactions),
                    TotalAmount (Purchases), Amount (Expenses), TotalRefund (Refunds),
                    TransactionType/Amount (CashTransactions).
                  </footer>
                </>
              )}
            </article>
          </div>

          {!loading && !hasData && (
            <Panel className="report-no-print">
              <p style={{ margin: 0, color: '#888' }}>
                Atur filter periode lalu klik Cari untuk menampilkan laporan keuangan.
              </p>
            </Panel>
          )}
        </>
      )}
    </PageShell>
  )
}
