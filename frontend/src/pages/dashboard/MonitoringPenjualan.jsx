import { useCallback, useEffect, useMemo, useState } from 'react'
import { salesApi } from '../../api/sales'
import Button from '../../components/ui/Button'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  DataTable,
  TableActions,
  TableBody,
  TableEmpty,
  TableHead,
  TableLink,
  TableRow,
  TableTd,
  TableTh,
} from '../../components/ui/Table'
import {
  OutletMonitoringFilters,
  PaymentBadge,
  TransactionDetailModal,
} from '../../components/pos'
import { useSalesFormData } from '../../hooks/useSalesFormData'
import { todayStr, monthStartStr } from '../../utils/date'
import { formatDateTime, formatRupiah } from '../../utils/format'
import {
  computeMonitoringSummary,
  computeOutletSummary,
} from '../../utils/outletMonitoring'

const defaultFilters = () => ({
  dateFrom: monthStartStr(),
  dateTo: todayStr(),
  outletId: '',
  paymentMethod: '',
  invoiceNumber: '',
})

function formatPercent(value) {
  return `${value.toFixed(1)}%`
}

export default function MonitoringPenjualan() {
  const { formData, loading: formLoading, error: formError } = useSalesFormData()
  const [history, setHistory] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(defaultFilters)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadHistory = useCallback(async (nextFilters) => {
    setListLoading(true)
    setError('')
    try {
      const data = await salesApi.getHistory({
        dateFrom: nextFilters.dateFrom,
        dateTo: nextFilters.dateTo,
        outletId: nextFilters.outletId || undefined,
        paymentMethod: nextFilters.paymentMethod || undefined,
        invoiceNumber: nextFilters.invoiceNumber || undefined,
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
      loadHistory(defaultFilters())
    }
  }, [formLoading, formData, loadHistory])

  const transactions = history?.transactions ?? []
  const outletRows = useMemo(
    () => computeOutletSummary(transactions, formData?.outlets ?? []),
    [transactions, formData?.outlets],
  )
  const summary = useMemo(
    () => computeMonitoringSummary(transactions, outletRows),
    [transactions, outletRows],
  )

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    loadHistory(filters)
  }

  const handleFilterReset = () => {
    const reset = defaultFilters()
    setFilters(reset)
    loadHistory(reset)
  }

  const openDetail = async (id) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      setDetail(await salesApi.getTransaction(id))
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const loading = formLoading || (listLoading && !history)
  const hasTransactions = transactions.length > 0

  return (
    <PageShell
      title="Monitoring Penjualan"
      description="Pantau performa penjualan multi-cabang dari SalesTransactions & Outlets"
      loading={loading}
      loadingMessage="Memuat monitoring penjualan..."
      error={formError}
      errorHint="Pastikan database POS sudah diinisialisasi."
    >
      {error && <div className="ui-alert ui-alert-error">{error}</div>}

      {formData && (
        <>
          <OutletMonitoringFilters
            formData={formData}
            {...filters}
            onChange={handleFilterChange}
            onSubmit={handleFilterSubmit}
            onReset={handleFilterReset}
          />

          {history && (
            <div className="pos-stat-row">
              <StatCard label="Total Omzet" value={formatRupiah(summary.totalGrandTotal)} />
              <StatCard label="Total Transaksi" value={summary.totalTransactions} />
              <StatCard
                label="Cabang Aktif"
                value={`${summary.activeOutlets} / ${summary.totalOutlets}`}
              />
              <StatCard
                label="Cabang Terbaik"
                value={
                  summary.bestOutlet
                    ? `${summary.bestOutlet.outletName} (${formatRupiah(summary.bestOutlet.grandTotal)})`
                    : '—'
                }
              />
            </div>
          )}

          <Panel title="Rekap Penjualan per Cabang">
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>ID</TableTh>
                  <TableTh>Nama Cabang</TableTh>
                  <TableTh align="right">Transaksi</TableTh>
                  <TableTh align="right">Subtotal</TableTh>
                  <TableTh align="right">Diskon</TableTh>
                  <TableTh align="right">Pajak</TableTh>
                  <TableTh align="right">Total</TableTh>
                  <TableTh align="right">Rata-rata</TableTh>
                  <TableTh align="right">Kontribusi</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {!outletRows.length ? (
                  <TableEmpty colSpan={9}>Belum ada data cabang</TableEmpty>
                ) : (
                  outletRows.map((row) => (
                    <TableRow key={row.outletId}>
                      <TableTd muted>{row.outletId}</TableTd>
                      <TableTd>
                        <TableLink>{row.outletName}</TableLink>
                      </TableTd>
                      <TableTd align="right">{row.transactionCount}</TableTd>
                      <TableTd align="right">{formatRupiah(row.subTotal)}</TableTd>
                      <TableTd align="right">{formatRupiah(row.discount)}</TableTd>
                      <TableTd align="right">{formatRupiah(row.tax)}</TableTd>
                      <TableTd align="right" emphasize>
                        {formatRupiah(row.grandTotal)}
                      </TableTd>
                      <TableTd align="right">
                        {row.transactionCount ? formatRupiah(row.avgPerTransaction) : '—'}
                      </TableTd>
                      <TableTd align="right">
                        {summary.totalGrandTotal ? formatPercent(row.contributionPercent) : '—'}
                      </TableTd>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </DataTable>
            <p className="pos-form-hint" style={{ marginTop: '0.75rem' }}>
              Kolom sesuai agregasi SalesTransactions (OutletId, SubTotal, Discount, Tax, GrandTotal)
              per cabang pada periode filter.
            </p>
          </Panel>

          <Panel title="Detail Transaksi">
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>Invoice</TableTh>
                  <TableTh>Tanggal</TableTh>
                  <TableTh>Cabang</TableTh>
                  <TableTh>Kasir</TableTh>
                  <TableTh>Pelanggan</TableTh>
                  <TableTh align="right">Item</TableTh>
                  <TableTh align="right">Total</TableTh>
                  <TableTh>Metode</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!hasTransactions ? (
                  <TableEmpty colSpan={9}>
                    Tidak ada transaksi untuk periode dan filter ini
                  </TableEmpty>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableTd>
                        <TableLink>{tx.invoiceNumber}</TableLink>
                      </TableTd>
                      <TableTd>{formatDateTime(tx.transactionDate)}</TableTd>
                      <TableTd>{tx.outletName}</TableTd>
                      <TableTd>{tx.cashierName}</TableTd>
                      <TableTd>{tx.customerName}</TableTd>
                      <TableTd align="right">{tx.itemCount}</TableTd>
                      <TableTd align="right" emphasize>
                        {formatRupiah(tx.grandTotal)}
                      </TableTd>
                      <TableTd>
                        <PaymentBadge method={tx.paymentMethod} />
                      </TableTd>
                      <TableActions>
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => openDetail(tx.id)}
                        >
                          Detail
                        </Button>
                      </TableActions>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </DataTable>
          </Panel>
        </>
      )}

      <TransactionDetailModal
        open={detailLoading || !!detail}
        onClose={() => {
          setDetail(null)
          setDetailLoading(false)
        }}
        loading={detailLoading}
        detail={detail}
      />
    </PageShell>
  )
}
