import { formatRupiah } from '../../utils/format'

export default function CartTable({
  cart,
  onUpdateItem,
  onRemoveItem,
  emptyMessage = 'Klik produk untuk menambahkan ke keranjang',
  enforceMaxStock = true,
}) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table pos-cart-table">
        <thead>
          <tr>
            <th>Produk</th>
            <th>Harga</th>
            <th>Qty</th>
            <th>Diskon</th>
            <th>Total</th>
            <th aria-label="Aksi" />
          </tr>
        </thead>
        <tbody>
          {cart.length === 0 ? (
            <tr>
              <td colSpan={6} className="ui-table-empty">{emptyMessage}</td>
            </tr>
          ) : (
            cart.map((item) => (
              <tr key={item.productId}>
                <td>
                  <div className="pos-cart-product">{item.productName}</div>
                  {item.productCode && (
                    <div className="pos-cart-code">{item.productCode}</div>
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={item.price}
                    onChange={(e) => onUpdateItem(item.productId, 'price', e.target.value)}
                    className="pos-input-sm"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    max={enforceMaxStock ? item.maxStock : undefined}
                    value={item.qty}
                    onChange={(e) => onUpdateItem(item.productId, 'qty', e.target.value)}
                    className="pos-input-sm"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={item.discount}
                    onChange={(e) => onUpdateItem(item.productId, 'discount', e.target.value)}
                    className="pos-input-sm"
                  />
                </td>
                <td className="pos-line-total">
                  {formatRupiah(item.qty * item.price - item.discount)}
                </td>
                <td>
                  <button
                    type="button"
                    className="pos-btn-remove"
                    onClick={() => onRemoveItem(item.productId)}
                    aria-label="Hapus"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
