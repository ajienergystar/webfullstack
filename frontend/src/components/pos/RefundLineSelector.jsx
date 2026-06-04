import FormField from '../ui/FormField'
import {
  DataTable,
  TableBody,
  TableEmptyMessage,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '../ui/Table'
import { formatRupiah } from '../../utils/format'

export default function RefundLineSelector({
  lines = [],
  selections,
  onQtyChange,
  emptyMessage = 'Tidak ada item yang bisa direfund',
}) {
  const refundable = lines.filter((l) => l.availableQty > 0)

  if (refundable.length === 0) {
    return <TableEmptyMessage>{emptyMessage}</TableEmptyMessage>
  }

  return (
    <DataTable className="pos-refund-table">
      <TableHead>
        <TableRow>
          <TableTh>Produk</TableTh>
          <TableTh align="right">Terjual</TableTh>
          <TableTh align="right">Sudah Refund</TableTh>
          <TableTh align="right">Sisa</TableTh>
          <TableTh align="right">Harga</TableTh>
          <TableTh align="right">Qty Refund</TableTh>
          <TableTh align="right">Subtotal</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {refundable.map((line) => {
          const qty = selections[line.salesDetailId] ?? 0
          const subtotal = qty * line.price
          return (
            <TableRow key={line.salesDetailId}>
              <TableTd>
                <div className="pos-cart-product">{line.productName}</div>
                <div className="pos-cart-code">{line.productCode}</div>
              </TableTd>
              <TableTd align="right">{line.soldQty}</TableTd>
              <TableTd align="right">{line.refundedQty}</TableTd>
              <TableTd align="right" emphasize>{line.availableQty}</TableTd>
              <TableTd align="right">{formatRupiah(line.price)}</TableTd>
              <TableTd align="right">
                <input
                  type="number"
                  className="pos-input-sm"
                  min="0"
                  max={line.availableQty}
                  value={qty || ''}
                  placeholder="0"
                  onChange={(e) => onQtyChange(line.salesDetailId, e.target.value, line)}
                />
              </TableTd>
              <TableTd align="right" className="pos-line-total">
                {qty > 0 ? formatRupiah(subtotal) : '—'}
              </TableTd>
            </TableRow>
          )
        })}
      </TableBody>
    </DataTable>
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
