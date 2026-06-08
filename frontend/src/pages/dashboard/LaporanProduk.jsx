import { useCallback, useEffect, useMemo, useState } from 'react'
import { productsApi } from '../../api/products'
import { getStoredUser } from '../../api/auth'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import { formatDateTime, formatRupiah } from '../../utils/format'
import { exportProductReportPdf } from '../../utils/productReportPdf'
import {
  computeCategoryBreakdown,
  computeProductReportSummary,
  formatProductFilterSummary,
  formatReportDateTime,
  LOW_STOCK_THRESHOLD,
  productStatusLabel,
} from '../../utils/productReport'

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
  categoryId: '',
  activeFilter: '',
}

export default function LaporanProduk() {
  const [formData, setFormData] = useState(null)
  const [listData, setListData] = useState(null)
  const [filters, setFilters] = useState(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const user = getStoredUser()

  const loadReport = useCallback(async (f) => {
    setLoading(true)
    setError('')
    try {
      const params = { search: f.search || undefined }
      if (f.categoryId) params.categoryId = f.categoryId
      if (f.activeFilter === 'active') params.isActive = true
      if (f.activeFilter === 'inactive') params.isActive = false

      const [fd, data] = await Promise.all([
        productsApi.getFormData(),
        productsApi.list(params),
      ])
      setFormData(fd)
      setListData(data)
    } catch (err) {
      setError(err.message)
      setListData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReport(emptyFilters)
  }, [loadReport])

  const products = listData?.products ?? []
  const summary = useMemo(() => computeProductReportSummary(products), [products])
  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(products), [products])
  const filterSummary = useMemo(
    () => formatProductFilterSummary(filters, formData),
    [filters, formData],
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
    if (!listData) return
    setExporting(true)
    try {
      exportProductReportPdf({
        listData,
        filters,
        formData,
        printedBy: user?.fullName,
      })
    } catch (err) {
      setError(err.message || 'Gagal mengekspor PDF')
    } finally {
      setExporting(false)
    }
  }

  const hasData = products.length > 0

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
      title="Laporan Produk"
      description="Daftar master produk, stok, dan nilai persediaan dari tabel Products"
      loading={loading && !listData}
      loadingMessage="Memuat laporan..."
    >
      {error && <div className="ui-alert ui-alert-error report-no-print">{error}</div>}

      <div className="report-no-print">
        <Panel className="pos-product-filters">
          <form onSubmit={handleFilterSubmit} className="pos-refund-list-filter">
            <FormField label="Cari">
              <input
                type="text"
                placeholder="Nama, kode, barcode..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </FormField>
            <FormField label="Kategori">
              <select
                value={filters.categoryId}
                onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              >
                <option value="">Semua</option>
                {(formData?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.categoryName}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select
                value={filters.activeFilter}
                onChange={(e) => handleFilterChange('activeFilter', e.target.value)}
              >
                <option value="">Semua</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
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
        <article className="report-document" aria-label="Laporan produk">
          <header className="report-letterhead">
            <h2>ERP Point Of Sale</h2>
            <h3>LAPORAN PRODUK</h3>
            <p>Filter: {filterSummary}</p>
            <p>
              Dicetak: {formatReportDateTime()} · Oleh: {user?.fullName || '-'}
            </p>
          </header>

          <dl className="report-meta-grid">
            <div>
              <dt>Sumber Data</dt>
              <dd>Products, Categories, Brands</dd>
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

          <section aria-labelledby="report-product-summary-heading">
            <h4 id="report-product-summary-heading" className="report-section-title">
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

          {categoryBreakdown.length > 0 && (
            <section aria-labelledby="report-category-heading">
              <h4 id="report-category-heading" className="report-section-title">
                Rekap per Kategori
              </h4>
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th className="num">Jumlah Produk</th>
                      <th className="num">Total Stok</th>
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
                      <td className="num">{formatRupiah(summary.purchaseValue)}</td>
                      <td className="num">{formatRupiah(summary.sellingValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          <section aria-labelledby="report-product-detail-heading">
            <h4 id="report-product-detail-heading" className="report-section-title">
              Daftar Produk
            </h4>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Kode</th>
                    <th>Nama Produk</th>
                    <th>Barcode</th>
                    <th>Kategori</th>
                    <th>Brand</th>
                    <th className="num">Harga Beli</th>
                    <th className="num">Harga Jual</th>
                    <th className="num">Stok</th>
                    <th>Satuan</th>
                    <th>Status</th>
                    <th>Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {!hasData ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '1.5rem' }}>
                        Tidak ada produk untuk filter ini
                      </td>
                    </tr>
                  ) : (
                    products.map((p, index) => (
                      <tr key={p.id}>
                        <td>{index + 1}</td>
                        <td>{p.productCode || '—'}</td>
                        <td>{p.productName}</td>
                        <td>{p.barcode || '—'}</td>
                        <td>{p.categoryName || '—'}</td>
                        <td>{p.brandName || '—'}</td>
                        <td className="num">{formatRupiah(p.purchasePrice)}</td>
                        <td className="num">{formatRupiah(p.sellingPrice)}</td>
                        <td className="num">
                          <span className={p.stock <= LOW_STOCK_THRESHOLD ? 'report-stock-low' : undefined}>
                            {p.stock}
                          </span>
                        </td>
                        <td>{p.unit || '—'}</td>
                        <td>{productStatusLabel(p.isActive)}</td>
                        <td>{formatDateTime(p.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {hasData && (
                  <tfoot>
                    <tr>
                      <td colSpan={8}>Jumlah ({summary.count} produk)</td>
                      <td className="num">{summary.totalStock}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <footer className="report-footer-note">
            Dokumen ini dibuat otomatis dari sistem ERP Point Of Sale.
            Kolom sesuai struktur database: ProductCode, ProductName, Barcode, PurchasePrice,
            SellingPrice, Stock, Unit, IsActive, CreatedAt.
          </footer>
        </article>
      </div>

      {!loading && !hasData && (
        <Panel className="report-no-print">
          <p style={{ margin: 0, color: '#888' }}>
            Atur filter lalu klik Cari untuk menampilkan laporan produk.
          </p>
        </Panel>
      )}
    </PageShell>
  )
}
