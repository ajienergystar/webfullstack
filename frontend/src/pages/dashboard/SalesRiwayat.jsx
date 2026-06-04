import { useCallback, useEffect, useState } from 'react'
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
  PaymentBadge,
  TransactionDetailModal,
  TransactionFilters,
} from '../../components/pos'
import { useSalesFormData } from '../../hooks/useSalesFormData'
import { todayStr, monthStartStr } from '../../utils/date'
import { formatDateTime, formatRupiah } from '../../utils/format'

export default function SalesRiwayat() {
  const { formData, loading: formLoading, error: formError } = useSalesFormData()
  const [history, setHistory] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    dateFrom: monthStartStr(),
    dateTo: todayStr(),
    invoiceNumber: '',
    customerId: '',
    outletId: '',
    userId: '',
    paymentMethod: '',
  })

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

  return (
    <PageShell
      title="Riwayat Transaksi"
      description="Data dari SalesTransactions & SalesTransactionDetails"
      loading={loading}
      loadingMessage="Memuat riwayat..."
      error={formError}
      errorHint="Pastikan database POS sudah diinisialisasi."
    >
      {error && <div className="ui-alert ui-alert-error">{error}</div>}

      {formData && (
        <>
          <TransactionFilters
            formData={formData}
            {...filters}
            onChange={handleFilterChange}
            onSubmit={handleFilterSubmit}
            onReset={handleFilterReset}
          />

          {history && (
            <div className="pos-stat-row">
              <StatCard label="Total Transaksi" value={history.totalCount} />
              <StatCard label="Total Penjualan" value={formatRupiah(history.totalGrandTotal)} />
            </div>
          )}

          <Panel>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>Invoice</TableTh>
                  <TableTh>Tanggal</TableTh>
                  <TableTh>Pelanggan</TableTh>
                  <TableTh>Outlet</TableTh>
                  <TableTh>Kasir</TableTh>
                  <TableTh align="right">Item</TableTh>
                  <TableTh align="right">Total</TableTh>
                  <TableTh align="right">Bayar</TableTh>
                  <TableTh>Metode</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!history?.transactions?.length ? (
                  <TableEmpty colSpan={10}>Tidak ada transaksi untuk filter ini</TableEmpty>
                ) : (
                  history.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableTd><TableLink>{tx.invoiceNumber}</TableLink></TableTd>
                      <TableTd>{formatDateTime(tx.transactionDate)}</TableTd>
                      <TableTd>{tx.customerName}</TableTd>
                      <TableTd>{tx.outletName}</TableTd>
                      <TableTd>{tx.cashierName}</TableTd>
                      <TableTd align="right">{tx.itemCount}</TableTd>
                      <TableTd align="right" emphasize>{formatRupiah(tx.grandTotal)}</TableTd>
                      <TableTd align="right">{formatRupiah(tx.paidAmount)}</TableTd>
                      <TableTd><PaymentBadge method={tx.paymentMethod} /></TableTd>
                      <TableActions>
                        <Button variant="secondary" size="sm" type="button" onClick={() => openDetail(tx.id)}>
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
        onClose={() => { setDetail(null); setDetailLoading(false) }}
        loading={detailLoading}
        detail={detail}
      />
    </PageShell>
  )
}
