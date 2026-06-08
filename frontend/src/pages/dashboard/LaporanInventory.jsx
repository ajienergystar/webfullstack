import { useCallback, useEffect, useMemo, useState } from 'react'
import { productsApi } from '../../api/products'
import { stockApi } from '../../api/stock'
import { getStoredUser } from '../../api/auth'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import { formatDateTime, formatRupiah } from '../../utils/format'
import { exportInventoryReportPdf } from '../../utils/inventoryReportPdf'
import {
  computeInventoryCategoryBreakdown,
  computeInventorySummary,
  computeMovementSummary,
  formatInventoryFilterSummary,
  formatReportDateTime,
  LOW_STOCK_THRESHOLD,
  mergeStockWithPrices,
  movementTypeLabel,
  productStatusLabel,
} from '../../utils/inventoryReport'

function printReport() {
  document.body.classList.add('report-print-mode')
  window.print()
  window.addEventListener(
    'afterprint',
    () => document.body.classList.remove('report-print-mode'),
    { once: true },
  )
}

const emptyFilters = {
  search: '',
  lowStockOnly: false,
  movementType: '',
  movementSearch: '',
}

export default function LaporanInventory() {
  const [overview, setOverview] = useState(null)
  const [movements, setMovements] = useState(null)
  const [priceProducts, setPriceProducts] = useState([])
  const [filters, setFilters] = useState(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const user = getStoredUser()

  const loadReport = useCallback(async (f) => {
    setLoading(true)
    setError('')
    try {
      const [ov, mov, priced] = await Promise.all([
        stockApi.overview({
          search: f.search || undefined,
          lowStockOnly: f.lowStockOnly || undefined,
        }),
        stockApi.movements({
          search: f.movementSearch || undefined,
          movementType: f.movementType || undefined,
        }),
        productsApi.list({ search: f.search || undefined }),
      ])
      setOverview(ov)
      setMovements(mov)
      setPriceProducts(priced.products ?? [])
    } catch (err) {
      setError(err.message)
      setOverview(null)
      setMovements(null)
      setPriceProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReport(emptyFilters)
  }, [loadReport])

  const enrichedProducts = useMemo(
    () => mergeStockWithPrices(overview?.products ?? [], priceProducts),
    [overview, priceProducts],
  )

  const summary = useMemo(
    () => computeInventorySummary(enrichedProducts),
    [enrichedProducts],
  )

  const categoryBreakdown = useMemo(
    () => computeInventoryCategoryBreakdown(enrichedProducts),
    [enrichedProducts],
  )

  const movementList = movements?.movements ?? []
  const movSummary = useMemo(
    () => computeMovementSummary(movementList),
    [movementList],
  )

  const filterSummary = useMemo(
    () => formatInventoryFilterSummary(filters),
    [filters],
  )

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    loadReport(filters)
  }

  const handleFilterReset = () => {
    setFilters(emptyFilters)
    loadReport(emptyFilters)
  }

  const handleExportPdf = async () => {
    if (!overview) return
    setExporting(true)
    try {
      exportInventoryReportPdf({
        overview,
        movements,
        enrichedProducts,
        filters,
        printedBy: user?.fullName,
      })
    } catch (err) {
      setError(err.message || 'Gagal mengekspor PDF')
    } finally {
      setExporting(false)
    }
  }

  const hasStockData = enrichedProducts.length > 0
  const hasMovementData = movementList.length > 0
  const hasData = hasStockData || hasMovementData

  const toolbar = (
    <div className="report-toolbar report-no-print">
      <Button
        variant="secondary"
        type="button"
        className="ui-btn-outline"
        onClick={printReport}
        disabled={!hasData || loading}
      >
        Cetak
      </Button>
      <Button
        variant="primary"
        type="button"
        onClick={handleExportPdf}
        disabled={!hasData || loading || exporting}
      >
        {exporting ? 'Mengekspor...' : 'Export PDF'}
      </Button>
    </div>
  )

  return (
    <PageShell
      title="Laporan Inventory"
      description="Posisi stok dan riwayat pergerakan dari Products.Stock & StockMovements"
      loading={loading && !overview}
      loadingMessage="Memuat laporan inventory..."
    >
      {error && <div className="ui-alert ui-alert-error report-no-print">{error}</div>}

      <div className="report-no-print">
        <Panel className="pos-product-filters">
          <form onSubmit={handleFilterSubmit} className="pos-refund-list-filter">
            <FormField label="Cari Produk">
              <input
                type="text"
                placeholder="Nama, kode, barcode..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </FormField>
            <FormField label="Filter Stok">
              <label className="pos-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.lowStockOnly}
                  onChange={(e) => handleFilterChange('lowStockOnly', e.target.checked)}
                />
                Stok rendah (≤{LOW_STOCK_THRESHOLD})
              </label>
            </FormField>
            <FormField label="Tipe Pergerakan">
              <select
                value={filters.movementType}
                onChange={(e) => handleFilterChange('movementType', e.target.value)}
              >
                <option value="">Semua</option>
                <option value="IN">IN — Masuk</option>
                <option value="OUT">OUT — Keluar</option>
              </select>
            </FormField>
            <FormField label="Cari Riwayat">
              <input
                type="text"
                placeholder="Produk, referensi..."
                value={filters.movementSearch}
                onChange={(e) => handleFilterChange('movementSearch', e.target.value)}
              />
            </FormField>
            <Button variant="primary" type="submit">Cari</Button>
            <Button variant="secondary" type="button" onClick={handleFilterReset}>
              Reset
            </Button>
          </form>
        </Panel>
        {toolbar}
      </div>

      <div id="report-print-root">
        <article className="report-document" aria-label="Laporan inventory">
          <header className="report-letterhead">
            <h2>ERP Point Of Sale</h2>
            <h3>LAPORAN INVENTORY</h3>
            <p>Filter: {filterSummary}</p>
            <p>
              Dicetak: {formatReportDateTime()} · Oleh: {user?.fullName || '-'}
            </p>
          </header>

          <dl className="report-meta-grid">
            <div>
              <dt>Sumber Data</dt>
              <dd>Products.Stock, StockMovements, Categories</dd>
            </div>
            <div>
              <dt>Total Produk (filter)</dt>
              <dd>{summary.count} item</dd>
            </div>
            <div>
              <dt>Produk Aktif / Nonaktif</dt>
              <dd>{summary.activeCount} / {summary.inactiveCount}</dd>
            </div>
          </dl>

          <section aria-labelledby="report-inventory-summary-heading">
            <h4 id="report-inventory-summary-heading" className="report-section-title">
              Ringkasan Persediaan
            </h4>
            <div className="report-summary-row">
              <div className="report-summary-box">
                <span>Total Stok (unit)</span>
                <strong>{summary.totalStock}</strong>
              </div>
              <div className="report-summary-box">
                <span>Stok Rendah (≤{LOW_STOCK_THRESHOLD})</span>
                <strong>{summary.lowStockCount}</strong>
              </div>
              <div className="report-summary-box">
                <span>Nilai Persediaan (Harga Beli × Stok)</span>
                <strong>{formatRupiah(summary.purchaseValue)}</strong>
              </div>
              <div className="report-summary-box report-summary-highlight">
                <span>Nilai Jual Potensial (Harga Jual × Stok)</span>
                <strong>{formatRupiah(summary.sellingValue)}</strong>
              </div>
            </div>
          </section>

          <section aria-labelledby="report-movement-summary-heading">
            <h4 id="report-movement-summary-heading" className="report-section-title">
              Ringkasan Pergerakan Stok
            </h4>
            <div className="report-summary-row">
              <div className="report-summary-box">
                <span>Baris Riwayat (max 200)</span>
                <strong>{movSummary.totalLines}</strong>
              </div>
              <div className="report-summary-box">
                <span>IN — Qty Masuk</span>
                <strong>{movSummary.inQty}</strong>
              </div>
              <div className="report-summary-box">
                <span>OUT — Qty Keluar</span>
                <strong>{movSummary.outQty}</strong>
              </div>
              <div className="report-summary-box">
                <span>Net (IN − OUT)</span>
                <strong>{movSummary.netQty}</strong>
              </div>
            </div>
          </section>

          {categoryBreakdown.length > 0 && (
            <section aria-labelledby="report-inventory-category-heading">
              <h4 id="report-inventory-category-heading" className="report-section-title">
                Rekap per Kategori
              </h4>
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th className="num">Jumlah Produk</th>
                      <th className="num">Total Stok</th>
                      <th className="num">Stok Rendah</th>
                      <th className="num">Nilai Persediaan</th>
                      <th className="num">Nilai Jual Potensial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryBreakdown.map((row) => (
                      <tr key={row.category}>
                        <td>{row.category}</td>
                        <td className="num">{row.count}</td>
                        <td className="num">{row.stock}</td>
                        <td className="num">{row.lowStockCount}</td>
                        <td className="num">{formatRupiah(row.purchaseValue)}</td>
                        <td className="num">{formatRupiah(row.sellingValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="num">{summary.count}</td>
                      <td className="num">{summary.totalStock}</td>
                      <td className="num">{summary.lowStockCount}</td>
                      <td className="num">{formatRupiah(summary.purchaseValue)}</td>
                      <td className="num">{formatRupiah(summary.sellingValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          <section aria-labelledby="report-inventory-stock-heading">
            <h4 id="report-inventory-stock-heading" className="report-section-title">
              Posisi Stok Produk
            </h4>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Kode</th>
                    <th>Nama Produk</th>
                    <th>Kategori</th>
                    <th className="num">Stok</th>
                    <th>Satuan</th>
                    <th className="num">Harga Beli</th>
                    <th className="num">Nilai Persediaan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!hasStockData ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '1.5rem' }}>
                        Tidak ada data stok untuk filter ini
                      </td>
                    </tr>
                  ) : (
                    enrichedProducts.map((p, index) => (
                      <tr key={p.id}>
                        <td>{index + 1}</td>
                        <td>{p.productCode || '—'}</td>
                        <td>{p.productName}</td>
                        <td>{p.categoryName || '—'}</td>
                        <td className="num">
                          <span
                            className={
                              p.stock <= LOW_STOCK_THRESHOLD ? 'report-stock-low' : undefined
                            }
                          >
                            {p.stock}
                          </span>
                        </td>
                        <td>{p.unit || '—'}</td>
                        <td className="num">{formatRupiah(p.purchasePrice)}</td>
                        <td className="num">
                          {formatRupiah((p.purchasePrice ?? 0) * (p.stock ?? 0))}
                        </td>
                        <td>{productStatusLabel(p.isActive)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {hasStockData && (
                  <tfoot>
                    <tr>
                      <td colSpan={4}>Jumlah ({summary.count} produk)</td>
                      <td className="num">{summary.totalStock}</td>
                      <td />
                      <td />
                      <td className="num">{formatRupiah(summary.purchaseValue)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <section aria-labelledby="report-inventory-movements-heading">
            <h4 id="report-inventory-movements-heading" className="report-section-title">
              Riwayat Pergerakan Stok
            </h4>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Kode</th>
                    <th>Produk</th>
                    <th>Tipe</th>
                    <th className="num">Qty</th>
                    <th>Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  {!hasMovementData ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                        Tidak ada pergerakan stok untuk filter ini
                      </td>
                    </tr>
                  ) : (
                    movementList.map((m) => (
                      <tr key={m.id}>
                        <td>{formatDateTime(m.createdAt)}</td>
                        <td>{m.productCode || '—'}</td>
                        <td>{m.productName}</td>
                        <td>{movementTypeLabel(m.movementType)}</td>
                        <td className="num">{m.qty}</td>
                        <td>{m.referenceNumber || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="report-footer-note">
            Dokumen ini dibuat otomatis dari sistem ERP Point Of Sale.
            Kolom stok sesuai Products (ProductCode, ProductName, Stock, Unit, IsActive);
            pergerakan sesuai StockMovements (MovementType, Qty, ReferenceNumber, CreatedAt).
          </footer>
        </article>
      </div>

      {!loading && !hasData && (
        <Panel className="report-no-print">
          <p style={{ margin: 0, color: '#888' }}>
            Atur filter lalu klik Cari untuk menampilkan laporan inventory.
          </p>
        </Panel>
      )}
    </PageShell>
  )
}
