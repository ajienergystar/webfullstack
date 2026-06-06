import { useCallback, useEffect, useState } from 'react'
import { onlineOrdersApi } from '../../api/onlineOrders'
import { outletsApi } from '../../api/outlets'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  DataTable,
  TableActions,
  TableBadge,
  TableBody,
  TableEmpty,
  TableHead,
  TableLink,
  TableRow,
  TableSubtext,
  TableTd,
  TableTh,
} from '../../components/ui/Table'
import { PaymentBadge, TransactionDetailModal } from '../../components/pos'
import { useSalesFormData } from '../../hooks/useSalesFormData'
import { todayStr, monthStartStr } from '../../utils/date'
import { formatDateTime, formatRupiah } from '../../utils/format'

const ORDER_SOURCES = [
  { value: 'Website', label: 'Website' },
  { value: 'App', label: 'Aplikasi Mobile' },
  { value: 'Shopee', label: 'Shopee' },
  { value: 'Tokopedia', label: 'Tokopedia' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'GrabFood', label: 'GrabFood' },
  { value: 'GoFood', label: 'GoFood' },
]

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'CONFIRMED', label: 'Dikonfirmasi' },
  { value: 'PROCESSING', label: 'Diproses' },
  { value: 'READY', label: 'Siap' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

const PAYMENT_STATUSES = [
  { value: 'UNPAID', label: 'Belum Bayar' },
  { value: 'PAID', label: 'Lunas' },
  { value: 'REFUNDED', label: 'Refund' },
]

const FULFILLMENT_LABELS = {
  Delivery: 'Antar',
  Pickup: 'Ambil di Toko',
  DineIn: 'Makan di Tempat',
}

const ORDER_STATUS_BADGE = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  READY: 'success',
  COMPLETED: 'success',
  CANCELLED: 'muted',
}

const PAYMENT_STATUS_BADGE = {
  UNPAID: 'warning',
  PAID: 'success',
  REFUNDED: 'danger',
}

const ORDER_STATUS_LABELS = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s.label]))
const PAYMENT_STATUS_LABELS = Object.fromEntries(PAYMENT_STATUSES.map((s) => [s.value, s.label]))

const NEXT_STATUS = {
  PENDING: { status: 'CONFIRMED', label: 'Konfirmasi' },
  CONFIRMED: { status: 'PROCESSING', label: 'Proses' },
  PROCESSING: { status: 'READY', label: 'Siap' },
}

function mapDetailForModal(detail) {
  if (!detail) return null
  const extraNotes = [
    detail.fulfillmentType && `Pengiriman: ${FULFILLMENT_LABELS[detail.fulfillmentType] || detail.fulfillmentType}`,
    detail.orderSource && `Sumber: ${detail.orderSource}`,
    detail.deliveryAddress && `Alamat: ${detail.deliveryAddress}`,
    detail.externalOrderId && `Ref eksternal: ${detail.externalOrderId}`,
    detail.invoiceNumber && `Invoice POS: ${detail.invoiceNumber}`,
    detail.notes,
  ].filter(Boolean).join(' · ')

  return {
    ...detail,
    invoiceNumber: detail.orderNumber,
    transactionDate: detail.orderDate,
    paidAmount: detail.paymentStatus === 'PAID' ? detail.grandTotal : null,
    notes: extraNotes || null,
  }
}

export default function OnlineOrder() {
  const { loading: formLoading, error: formError, userId } = useSalesFormData()
  const [listData, setListData] = useState(null)
  const [outlets, setOutlets] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionId, setActionId] = useState(null)

  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [filters, setFilters] = useState({
    search: '',
    dateFrom: monthStartStr(),
    dateTo: todayStr(),
    orderStatus: '',
    paymentStatus: '',
    orderSource: '',
    outletId: '',
  })

  const loadList = useCallback(async (f) => {
    setListLoading(true)
    setError('')
    try {
      const data = await onlineOrdersApi.list({
        search: f.search || undefined,
        dateFrom: f.dateFrom || undefined,
        dateTo: f.dateTo || undefined,
        orderStatus: f.orderStatus || undefined,
        paymentStatus: f.paymentStatus || undefined,
        orderSource: f.orderSource || undefined,
        outletId: f.outletId || undefined,
      })
      setListData(data)
    } catch (err) {
      setError(err.message)
      setListData(null)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    outletsApi.list({})
      .then((data) => setOutlets(data.outlets || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!formLoading) {
      loadList({ dateFrom: monthStartStr(), dateTo: todayStr() })
    }
  }, [formLoading, loadList])

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    loadList(filters)
  }

  const handleFilterReset = () => {
    const reset = {
      search: '',
      dateFrom: monthStartStr(),
      dateTo: todayStr(),
      orderStatus: '',
      paymentStatus: '',
      orderSource: '',
      outletId: '',
    }
    setFilters(reset)
    loadList(reset)
  }

  const openDetail = async (id) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      setDetail(await onlineOrdersApi.getById(id))
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleUpdateStatus = async (id, orderStatus, label) => {
    setActionId(id)
    setError('')
    try {
      await onlineOrdersApi.updateStatus(id, {
        orderStatus,
        processedByUserId: userId ? Number(userId) : null,
      })
      setSuccess(`Pesanan diperbarui: ${label}`)
      await loadList(filters)
      if (detail?.id === id) {
        setDetail(await onlineOrdersApi.getById(id))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId(null)
    }
  }

  const handleCancel = async (id, orderNumber) => {
    if (!window.confirm(`Batalkan pesanan ${orderNumber}?`)) return
    await handleUpdateStatus(id, 'CANCELLED', 'Dibatalkan')
  }

  const handleComplete = async (order) => {
    if (!window.confirm(`Selesaikan pesanan ${order.orderNumber} dan buat invoice POS?`)) return
    setActionId(order.id)
    setError('')
    try {
      const result = await onlineOrdersApi.complete(order.id, {
        userId: Number(userId),
        paymentMethod: order.paymentMethod || 'Cash',
      })
      setSuccess(`Pesanan selesai! Invoice: ${result.invoiceNumber}`)
      await loadList(filters)
      setDetail(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId(null)
    }
  }

  const loading = formLoading || (listLoading && !listData)

  const pageActions = (
    <Button variant="secondary" type="button" onClick={() => loadList(filters)} disabled={listLoading}>
      Muat Ulang
    </Button>
  )

  return (
    <PageShell
      title="Online Order"
      description="OnlineOrders & OnlineOrderDetails — pesanan dari website, app, marketplace, dan WhatsApp"
      actions={pageActions}
      loading={loading}
      loadingMessage="Memuat pesanan online..."
      error={formError}
      errorHint="Jalankan database/pos/online-order-tables.sql dan pastikan API berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && <div className="ui-alert ui-alert-error">{error}</div>}

      <Panel className="pos-product-filters">
        <form onSubmit={handleFilterSubmit} className="pos-refund-list-filter">
          <FormField label="Cari">
            <input
              type="text"
              placeholder="No. pesanan, nama, telepon..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </FormField>
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
          <FormField label="Status Pesanan">
            <select value={filters.orderStatus} onChange={(e) => handleFilterChange('orderStatus', e.target.value)}>
              <option value="">Semua</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Pembayaran">
            <select value={filters.paymentStatus} onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}>
              <option value="">Semua</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Sumber">
            <select value={filters.orderSource} onChange={(e) => handleFilterChange('orderSource', e.target.value)}>
              <option value="">Semua</option>
              {ORDER_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Outlet">
            <select value={filters.outletId} onChange={(e) => handleFilterChange('outletId', e.target.value)}>
              <option value="">Semua</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.outletName}</option>
              ))}
            </select>
          </FormField>
          <Button variant="primary" type="submit">Cari</Button>
          <Button variant="secondary" type="button" onClick={handleFilterReset}>Reset</Button>
        </form>
      </Panel>

      {listData && (
        <div className="pos-stat-row">
          <StatCard label="Total Pesanan" value={listData.totalCount} />
          <StatCard label="Menunggu Konfirmasi" value={listData.pendingCount} />
          <StatCard label="Sedang Diproses" value={listData.activeCount} />
          <StatCard label="Total Nilai" value={formatRupiah(listData.totalGrandTotal)} />
        </div>
      )}

      <Panel>
        <DataTable>
          <TableHead>
            <TableRow>
              <TableTh>No. Pesanan</TableTh>
              <TableTh>Tanggal</TableTh>
              <TableTh>Pelanggan</TableTh>
              <TableTh>Sumber</TableTh>
              <TableTh>Outlet</TableTh>
              <TableTh>Pengiriman</TableTh>
              <TableTh align="right">Item</TableTh>
              <TableTh align="right">Total</TableTh>
              <TableTh>Pembayaran</TableTh>
              <TableTh>Status</TableTh>
              <TableTh align="actions" aria-label="Aksi" />
            </TableRow>
          </TableHead>
          <TableBody>
            {!listData?.orders?.length ? (
              <TableEmpty colSpan={11}>Tidak ada pesanan online untuk filter ini</TableEmpty>
            ) : (
              listData.orders.map((order) => {
                const next = NEXT_STATUS[order.orderStatus]
                const isBusy = actionId === order.id
                const isFinal = order.orderStatus === 'COMPLETED' || order.orderStatus === 'CANCELLED'

                return (
                  <TableRow key={order.id}>
                    <TableTd>
                      <TableLink>{order.orderNumber}</TableLink>
                      {order.notes && <TableSubtext>{order.notes}</TableSubtext>}
                    </TableTd>
                    <TableTd>{formatDateTime(order.orderDate)}</TableTd>
                    <TableTd>
                      {order.customerName}
                      {order.customerPhone && <TableSubtext>{order.customerPhone}</TableSubtext>}
                    </TableTd>
                    <TableTd>{order.orderSource}</TableTd>
                    <TableTd>{order.outletName}</TableTd>
                    <TableTd>{FULFILLMENT_LABELS[order.fulfillmentType] || order.fulfillmentType}</TableTd>
                    <TableTd align="right">{order.itemCount}</TableTd>
                    <TableTd align="right" emphasize>{formatRupiah(order.grandTotal)}</TableTd>
                    <TableTd>
                      <TableBadge variant={PAYMENT_STATUS_BADGE[order.paymentStatus] || 'muted'}>
                        {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                      </TableBadge>
                      {order.paymentMethod && (
                        <div style={{ marginTop: '0.25rem' }}>
                          <PaymentBadge method={order.paymentMethod} />
                        </div>
                      )}
                    </TableTd>
                    <TableTd>
                      <TableBadge variant={ORDER_STATUS_BADGE[order.orderStatus] || 'muted'}>
                        {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
                      </TableBadge>
                    </TableTd>
                    <TableActions>
                      <Button variant="secondary" size="sm" type="button" onClick={() => openDetail(order.id)}>
                        Detail
                      </Button>
                      {!isFinal && next && (
                        <Button
                          variant="primary"
                          size="sm"
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleUpdateStatus(order.id, next.status, next.label)}
                        >
                          {isBusy ? '...' : next.label}
                        </Button>
                      )}
                      {order.orderStatus === 'READY' && (
                        <Button
                          variant="success"
                          size="sm"
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleComplete(order)}
                        >
                          {isBusy ? '...' : 'Selesai'}
                        </Button>
                      )}
                      {!isFinal && (
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleCancel(order.id, order.orderNumber)}
                        >
                          Batal
                        </Button>
                      )}
                    </TableActions>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </DataTable>
      </Panel>

      <TransactionDetailModal
        open={detailLoading || !!detail}
        onClose={() => { setDetail(null); setDetailLoading(false) }}
        loading={detailLoading}
        detail={mapDetailForModal(detail)}
        referenceLabel="invoiceNumber"
        dateField="transactionDate"
      />
    </PageShell>
  )
}
