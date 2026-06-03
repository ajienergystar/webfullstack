import { useCallback, useEffect, useState } from 'react'
import { stockApi } from '../../api/stock'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import { formatDateTime } from '../../utils/format'

const emptyAdjustForm = {
  productId: '',
  movementType: 'IN',
  qty: '',
  referenceNumber: '',
}

export default function MasterStok() {
  const [view, setView] = useState('inventory')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [overview, setOverview] = useState(null)
  const [movements, setMovements] = useState(null)
  const [products, setProducts] = useState([])

  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [movementTypeFilter, setMovementTypeFilter] = useState('')
  const [movementSearch, setMovementSearch] = useState('')

  const [adjustForm, setAdjustForm] = useState(emptyAdjustForm)
  const [submitting, setSubmitting] = useState(false)

  const loadOverview = useCallback(async () => {
    const data = await stockApi.overview({
      search: search || undefined,
      lowStockOnly: lowStockOnly || undefined,
    })
    setOverview(data)
  }, [search, lowStockOnly])

  const loadMovements = useCallback(async () => {
    const data = await stockApi.movements({
      search: movementSearch || undefined,
      movementType: movementTypeFilter || undefined,
    })
    setMovements(data)
  }, [movementSearch, movementTypeFilter])

  const loadFormData = useCallback(async () => {
    const data = await stockApi.getFormData()
    setProducts(data.products || [])
  }, [])

  useEffect(() => {
    Promise.all([loadOverview(), loadMovements(), loadFormData()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadOverview, loadMovements, loadFormData])

  const selectedProduct = products.find((p) => String(p.id) === adjustForm.productId)

  const handleAdjustSubmit = async (e) => {
    e.preventDefault()
    if (!adjustForm.productId) {
      setError('Pilih produk terlebih dahulu.')
      return
    }
    const qty = Number(adjustForm.qty)
    if (!qty || qty <= 0) {
      setError('Qty harus lebih dari 0.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await stockApi.adjust({
        productId: Number(adjustForm.productId),
        movementType: adjustForm.movementType,
        qty,
        referenceNumber: adjustForm.referenceNumber.trim() || null,
      })
      setSuccess(
        `${result.movementType} ${result.qty} — ${result.productName}. Stok baru: ${result.newStock} (${result.referenceNumber})`
      )
      setAdjustForm(emptyAdjustForm)
      await Promise.all([loadOverview(), loadMovements(), loadFormData()])
      setView('inventory')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const pageActions = view === 'adjust' ? (
    <Button variant="secondary" type="button" onClick={() => { setView('inventory'); setError('') }}>
      ← Kembali
    </Button>
  ) : (
    <Button variant="primary" type="button" onClick={() => { setView('adjust'); setError(''); setSuccess('') }}>
      + Penyesuaian Stok
    </Button>
  )

  return (
    <PageShell
      title="Stok & Inventory"
      description="Products.Stock & StockMovements — IN/OUT penjualan, refund, dan penyesuaian"
      actions={pageActions}
      loading={loading}
      loadingMessage="Memuat data stok..."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && <div className="ui-alert ui-alert-error">{error}</div>}

      {view !== 'adjust' && (
        <div className="pos-stok-tabs">
          <button
            type="button"
            className={view === 'inventory' ? 'pos-stok-tab active' : 'pos-stok-tab'}
            onClick={() => setView('inventory')}
          >
            Stok Produk
          </button>
          <button
            type="button"
            className={view === 'movements' ? 'pos-stok-tab active' : 'pos-stok-tab'}
            onClick={() => setView('movements')}
          >
            Riwayat Pergerakan
          </button>
        </div>
      )}

      {view === 'inventory' && overview && (
        <>
          <Panel className="pos-product-filters">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                loadOverview().catch((err) => setError(err.message))
              }}
              className="pos-refund-list-filter"
            >
              <FormField label="Cari Produk">
                <input
                  type="text"
                  placeholder="Nama, kode, barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Filter">
                <label className="pos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={lowStockOnly}
                    onChange={(e) => setLowStockOnly(e.target.checked)}
                  />
                  Stok rendah (≤ 5)
                </label>
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          <div className="pos-stat-row">
            <StatCard label="Total Produk" value={overview.totalProducts} />
            <StatCard label="Stok Rendah" value={overview.lowStockCount} />
            <StatCard label="Total Unit Stok" value={overview.totalStockUnits} />
          </div>

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Produk</th>
                    <th>Kategori</th>
                    <th>Stok</th>
                    <th>Satuan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!overview.products?.length ? (
                    <tr>
                      <td colSpan={6} className="ui-table-empty">Tidak ada data stok</td>
                    </tr>
                  ) : (
                    overview.products.map((p) => (
                      <tr key={p.id} className={!p.isActive ? 'pos-row-inactive' : undefined}>
                        <td className="pos-ref-link">{p.productCode || '—'}</td>
                        <td className="pos-cart-product">{p.productName}</td>
                        <td>{p.categoryName || '—'}</td>
                        <td>
                          <span className={p.stock <= 5 ? 'pos-stock-low' : 'pos-stock-ok'}>
                            {p.stock}
                          </span>
                        </td>
                        <td>{p.unit || '—'}</td>
                        <td>
                          <span className={`ui-badge ${p.isActive ? 'ui-badge-cash' : 'ui-badge-transfer'}`}>
                            {p.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
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

      {view === 'movements' && (
        <>
          <Panel className="pos-product-filters">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                loadMovements().catch((err) => setError(err.message))
              }}
              className="pos-refund-list-filter"
            >
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="Produk, referensi..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Tipe">
                <select
                  value={movementTypeFilter}
                  onChange={(e) => setMovementTypeFilter(e.target.value)}
                >
                  <option value="">Semua</option>
                  <option value="IN">IN (Masuk)</option>
                  <option value="OUT">OUT (Keluar)</option>
                </select>
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {movements && (
            <div className="pos-stat-row">
              <StatCard label="Riwayat (max 200)" value={movements.totalCount} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Produk</th>
                    <th>Tipe</th>
                    <th>Qty</th>
                    <th>Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  {!movements?.movements?.length ? (
                    <tr>
                      <td colSpan={5} className="ui-table-empty">Belum ada pergerakan stok</td>
                    </tr>
                  ) : (
                    movements.movements.map((m) => (
                      <tr key={m.id}>
                        <td>{formatDateTime(m.createdAt)}</td>
                        <td>
                          <div className="pos-cart-product">{m.productName}</div>
                          <div className="pos-cart-code">{m.productCode}</div>
                        </td>
                        <td>
                          <span className={`pos-movement-badge pos-movement-${m.movementType.toLowerCase()}`}>
                            {m.movementType}
                          </span>
                        </td>
                        <td><strong>{m.qty}</strong></td>
                        <td>{m.referenceNumber || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {view === 'adjust' && (
        <form onSubmit={handleAdjustSubmit}>
          <Panel title="Penyesuaian Stok Manual">
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Produk *">
                <select
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  required
                >
                  <option value="">— Pilih produk —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productCode} — {p.productName} (stok: {p.stock} {p.unit || ''})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tipe Pergerakan *">
                <select
                  value={adjustForm.movementType}
                  onChange={(e) => setAdjustForm({ ...adjustForm, movementType: e.target.value })}
                >
                  <option value="IN">IN — Stok Masuk</option>
                  <option value="OUT">OUT — Stok Keluar</option>
                </select>
              </FormField>
              <FormField label="Qty *">
                <input
                  type="number"
                  min="1"
                  value={adjustForm.qty}
                  onChange={(e) => setAdjustForm({ ...adjustForm, qty: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="No. Referensi">
                <input
                  type="text"
                  placeholder="Kosongkan untuk auto STK-YYYYMMDD-####"
                  value={adjustForm.referenceNumber}
                  onChange={(e) => setAdjustForm({ ...adjustForm, referenceNumber: e.target.value })}
                  maxLength={50}
                />
              </FormField>
            </div>
            {selectedProduct && (
              <div className="pos-sale-info" style={{ marginTop: '1rem' }}>
                <div><span>Stok saat ini</span><strong>{selectedProduct.stock} {selectedProduct.unit || ''}</strong></div>
                <div><span>Setelah {adjustForm.movementType}</span>
                  <strong>
                    {adjustForm.movementType === 'IN'
                      ? selectedProduct.stock + (Number(adjustForm.qty) || 0)
                      : Math.max(0, selectedProduct.stock - (Number(adjustForm.qty) || 0))}
                  </strong>
                </div>
              </div>
            )}
            <p className="pos-form-hint">
              Mencatat ke StockMovements dan memperbarui Products.Stock. OUT ditolak jika stok tidak cukup.
            </p>
            <div className="ui-actions-row">
              <Button variant="secondary" type="button" onClick={() => setView('inventory')}>
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
