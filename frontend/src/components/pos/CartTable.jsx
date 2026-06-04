import {
  DataTable,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '../ui/Table'
import { formatRupiah } from '../../utils/format'

export default function CartTable({
  cart,
  onUpdateItem,
  onRemoveItem,
  emptyMessage = 'Klik produk untuk menambahkan ke keranjang',
  enforceMaxStock = true,
}) {
  return (
    <DataTable className="pos-cart-table">
      <TableHead>
        <TableRow>
          <TableTh>Produk</TableTh>
          <TableTh align="right">Harga</TableTh>
          <TableTh align="right">Qty</TableTh>
          <TableTh align="right">Diskon</TableTh>
          <TableTh align="right">Total</TableTh>
          <TableTh align="actions" aria-label="Aksi" />
        </TableRow>
      </TableHead>
      <TableBody>
        {cart.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyMessage}</TableEmpty>
        ) : (
          cart.map((item) => (
            <TableRow key={item.productId}>
              <TableTd>
                <div className="pos-cart-product">{item.productName}</div>
                {item.productCode && (
                  <div className="pos-cart-code">{item.productCode}</div>
                )}
              </TableTd>
              <TableTd align="right">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={item.price}
                  onChange={(e) => onUpdateItem(item.productId, 'price', e.target.value)}
                  className="pos-input-sm"
                />
              </TableTd>
              <TableTd align="right">
                <input
                  type="number"
                  min="1"
                  max={enforceMaxStock ? item.maxStock : undefined}
                  value={item.qty}
                  onChange={(e) => onUpdateItem(item.productId, 'qty', e.target.value)}
                  className="pos-input-sm"
                />
              </TableTd>
              <TableTd align="right">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={item.discount}
                  onChange={(e) => onUpdateItem(item.productId, 'discount', e.target.value)}
                  className="pos-input-sm"
                />
              </TableTd>
              <TableTd align="right" className="pos-line-total">
                {formatRupiah(item.qty * item.price - item.discount)}
              </TableTd>
              <TableTd align="actions">
                <button
                  type="button"
                  className="pos-btn-remove"
                  onClick={() => onRemoveItem(item.productId)}
                  aria-label="Hapus"
                >
                  ×
                </button>
              </TableTd>
            </TableRow>
          ))
        )}
      </TableBody>
    </DataTable>
  )
}
