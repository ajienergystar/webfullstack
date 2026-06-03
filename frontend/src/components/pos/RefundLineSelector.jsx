import FormField from '../ui/FormField'
import { formatRupiah } from '../../utils/format'

export default function RefundLineSelector({
  lines = [],
  selections,
  onQtyChange,
  emptyMessage = 'Tidak ada item yang bisa direfund',
}) {
  const refundable = lines.filter((l) => l.availableQty > 0)

  if (refundable.length === 0) {
    return <p className="ui-table-empty" style={{ padding: '1.5rem' }}>{emptyMessage}</p>
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table pos-refund-table">
        <thead>
          <tr>
            <th>Produk</th>
            <th>Terjual</th>
            <th>Sudah Refund</th>
            <th>Sisa</th>
            <th>Harga</th>
            <th>Qty Refund</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {refundable.map((line) => {
            const qty = selections[line.salesDetailId] ?? 0
            const subtotal = qty * line.price
            return (
              <tr key={line.salesDetailId}>
                <td>
                  <div className="pos-cart-product">{line.productName}</div>
                  <div className="pos-cart-code">{line.productCode}</div>
                </td>
                <td>{line.soldQty}</td>
                <td>{line.refundedQty}</td>
                <td><strong>{line.availableQty}</strong></td>
                <td>{formatRupiah(line.price)}</td>
                <td>
                  <input
                    type="number"
                    className="pos-input-sm"
                    min="0"
                    max={line.availableQty}
                    value={qty || ''}
                    placeholder="0"
                    onChange={(e) => onQtyChange(line.salesDetailId, e.target.value, line)}
                  />
                </td>
                <td className="pos-line-total">{qty > 0 ? formatRupiah(subtotal) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function RefundReasonField({ reason, onReasonChange }) {
  return (
    <FormField label="Alasan Refund" className="pos-notes-field">
      <input
        type="text"
        placeholder="Contoh: Barang rusak, salah item"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
      />
    </FormField>
  )
}
