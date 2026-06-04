import Modal from '../ui/Modal'
import LoadingState from '../ui/LoadingState'
import {
  DataTable,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '../ui/Table'
import { formatDateTime, formatRupiah } from '../../utils/format'

function DetailInfoGrid({ items }) {
  const visible = items.filter((i) => i.value != null && i.value !== '')
  return (
    <div className="pos-detail-info">
      {visible.map(({ label, value }) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function LineItemsTable({ items }) {
  return (
    <DataTable>
      <TableHead>
        <TableRow>
          <TableTh>Kode</TableTh>
          <TableTh>Produk</TableTh>
          <TableTh align="right">Qty</TableTh>
          <TableTh align="right">Harga</TableTh>
          <TableTh align="right">Diskon</TableTh>
          <TableTh align="right">Total</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.detailId ?? item.productId}>
            <TableTd>{item.productCode}</TableTd>
            <TableTd>
              {item.productName}
              {item.unit && <span className="pos-unit"> ({item.unit})</span>}
            </TableTd>
            <TableTd align="right">{item.qty}</TableTd>
            <TableTd align="right">{formatRupiah(item.price)}</TableTd>
            <TableTd align="right">{formatRupiah(item.discount)}</TableTd>
            <TableTd align="right" emphasize>
              {formatRupiah(item.total ?? item.qty * item.price - item.discount)}
            </TableTd>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  )
}

function TotalsBlock({ detail }) {
  const rows = [
    ['Subtotal', detail.subTotal],
    ['Diskon', detail.discount],
    ['Pajak', detail.tax],
    ['Grand Total', detail.grandTotal, true],
  ]
  if (detail.paidAmount != null) rows.push(['Dibayar', detail.paidAmount])
  if (detail.changeAmount != null) rows.push(['Kembalian', detail.changeAmount])

  return (
    <div className="pos-detail-totals">
      {rows.map(([label, amount, highlight]) => (
        <div key={label} className={highlight ? 'pos-grand' : ''}>
          <span>{label}</span>
          <strong>{formatRupiah(amount)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function TransactionDetailModal({
  open,
  onClose,
  loading,
  detail,
  referenceLabel = 'invoiceNumber',
  dateField = 'transactionDate',
}) {
  const ref = detail?.[referenceLabel]
  const date = detail?.[dateField]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ref}
      subtitle={date ? formatDateTime(date) : undefined}
      size="md"
    >
      {loading && <LoadingState message="Memuat detail..." />}
      {!loading && detail && (
        <>
          <DetailInfoGrid
            items={[
              { label: 'Pelanggan', value: detail.customerName },
              { label: 'Telepon', value: detail.customerPhone },
              { label: 'Outlet', value: detail.outletName },
              { label: 'Alamat Outlet', value: detail.outletAddress },
              {
                label: 'Kasir',
                value: detail.cashierUsername
                  ? `${detail.cashierName} (${detail.cashierUsername})`
                  : detail.cashierName,
              },
              { label: 'Pembayaran', value: detail.paymentMethod },
              { label: 'Catatan', value: detail.notes },
            ]}
          />
          <LineItemsTable items={detail.items} />
          <TotalsBlock detail={detail} />
        </>
      )}
    </Modal>
  )
}
