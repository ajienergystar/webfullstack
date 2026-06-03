import { useCallback, useEffect, useState } from 'react'
import { salesApi } from '../../api/sales'
import Button from '../../components/ui/Button'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
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
            <div className="ui-table-wrap">
              <table className="ui-table">
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
                      <td colSpan={10} className="ui-table-empty">
                        Tidak ada transaksi untuk filter ini
                      </td>
                    </tr>
                  ) : (
                    history.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="pos-ref-link">{tx.invoiceNumber}</td>
                        <td>{formatDateTime(tx.transactionDate)}</td>
                        <td>{tx.customerName}</td>
                        <td>{tx.outletName}</td>
                        <td>{tx.cashierName}</td>
                        <td>{tx.itemCount}</td>
                        <td className="pos-amount">{formatRupiah(tx.grandTotal)}</td>
                        <td>{formatRupiah(tx.paidAmount)}</td>
                        <td><PaymentBadge method={tx.paymentMethod} /></td>
                        <td>
                          <Button variant="secondary" size="sm" type="button" onClick={() => openDetail(tx.id)}>
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

      <TransactionDetailModal
        open={detailLoading || !!detail}
        onClose={() => { setDetail(null); setDetailLoading(false) }}
        loading={detailLoading}
        detail={detail}
      />
    </PageShell>
  )
}
