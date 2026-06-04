import { useMemo, useState } from 'react'
import { formatRupiah } from '../../utils/format'

export default function ProductSearchGrid({
  products = [],
  onSelect,
  respectStock = true,
  priceField = 'sellingPrice',
  priceLabel = 'Harga',
  searchPlaceholder = 'Cari produk (nama, kode, barcode)...',
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      p.productName.toLowerCase().includes(q)
      || p.productCode.toLowerCase().includes(q)
      || (p.barcode && p.barcode.includes(q))
      || (p.categoryName && p.categoryName.toLowerCase().includes(q)),
    )
  }, [products, search])

  return (
    <section className="pos-products-panel">
      <div className="pos-search-bar">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="pos-product-grid">
        {filtered.map((product) => {
          const outOfStock = respectStock && product.stock <= 0
          return (
            <button
              key={product.id}
              type="button"
              className={`pos-product-card ${outOfStock ? 'out-of-stock' : ''}`}
              onClick={() => onSelect(product)}
              disabled={outOfStock}
            >
              <div className="pos-product-name">{product.productName}</div>
              <div className="pos-product-code">{product.productCode}</div>
              <div className="pos-product-price">
                {priceLabel}: {formatRupiah(product[priceField] ?? 0)}
              </div>
              <div className="pos-product-stock">
                Stok: {product.stock} {product.unit || ''}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
