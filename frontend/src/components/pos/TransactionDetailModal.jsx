import Modal from '../ui/Modal'
import LoadingState from '../ui/LoadingState'
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

function LineItemsTable({ items, showStock }) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
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
          {items.map((item) => (
            <tr key={item.detailId ?? item.productId}>
              <td>{item.productCode}</td>
              <td>
                {item.productName}
                {item.unit && <span className="pos-unit"> ({item.unit})</span>}
              </td>
              <td>{item.qty}</td>
              <td>{formatRupiah(item.price)}</td>
              <td>{formatRupiah(item.discount)}</td>
              <td>{formatRupiah(item.total ?? item.qty * item.price - item.discount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
