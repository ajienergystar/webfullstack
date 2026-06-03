import { useCallback, useEffect, useState } from 'react'
import { productsApi } from '../../api/products'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import ProductFormFields, {
  emptyProductForm,
  formToPayload,
  productToForm,
} from '../../components/pos/ProductFormFields'
import { formatRupiah } from '../../utils/format'

export default function MasterProduk() {
  const [view, setView] = useState('list')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyProductForm)
  const [submitting, setSubmitting] = useState(false)

  const loadFormData = useCallback(async () => {
    const data = await productsApi.getFormData()
    setCategories(data.categories || [])
  }, [])

  const loadList = useCallback(async () => {
    const params = { search: search || undefined }
    if (categoryFilter) params.categoryId = categoryFilter
    if (activeFilter === 'active') params.isActive = true
    if (activeFilter === 'inactive') params.isActive = false
    const data = await productsApi.list(params)
    setListData(data)
  }, [search, categoryFilter, activeFilter])

  useEffect(() => {
    Promise.all([loadFormData(), loadList()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadFormData, loadList])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyProductForm)
    setError('')
    setSuccess('')
    setView('form')
  }

  const openEdit = async (id) => {
    setError('')
    setSuccess('')
    try {
      const product = await productsApi.getById(id)
      setEditingId(id)
      setForm(productToForm(product))
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.productName.trim()) {
      setError('Nama produk wajib diisi.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = formToPayload(form)
      const result = editingId
        ? await productsApi.update(editingId, payload)
        : await productsApi.create(payload)
      setSuccess(
        editingId
          ? `Produk "${result.productName}" berhasil diperbarui.`
          : `Produk baru: ${result.productCode} — ${result.productName}`
      )
      await loadList()
      setView('list')
      setEditingId(null)
      setForm(emptyProductForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Produk Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Produk
    </Button>
  )

  return (
    <PageShell
      title="Master Produk"
      description="Products — kode, harga, stok, kategori, dan status aktif"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data produk..."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && <div className="ui-alert ui-alert-error">{error}</div>}

      {view === 'list' && (
        <>
          <Panel className="pos-product-filters">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                loadList().catch((err) => setError(err.message))
              }}
              className="pos-refund-list-filter"
            >
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="Nama, kode, barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Kategori">
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">Semua</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.categoryName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                  <option value="">Semua</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {listData && (
            <div className="pos-stat-row">
              <StatCard label="Total Produk" value={listData.totalCount} />
              <StatCard label="Produk Aktif" value={listData.activeCount} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th>Kategori</th>
                    <th>Harga Jual</th>
                    <th>Stok</th>
                    <th>Satuan</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.products?.length ? (
                    <tr>
                      <td colSpan={8} className="ui-table-empty">Belum ada produk</td>
                    </tr>
                  ) : (
                    listData.products.map((p) => (
                      <tr key={p.id} className={!p.isActive ? 'pos-row-inactive' : undefined}>
                        <td className="pos-ref-link">{p.productCode || '—'}</td>
                        <td>
                          <div className="pos-cart-product">{p.productName}</div>
                          {p.barcode && <div className="pos-cart-code">{p.barcode}</div>}
                        </td>
                        <td>{p.categoryName || '—'}</td>
                        <td className="pos-amount">{formatRupiah(p.sellingPrice)}</td>
                        <td>
                          <span className={p.stock <= 5 ? 'pos-stock-low' : undefined}>{p.stock}</span>
                        </td>
                        <td>{p.unit || '—'}</td>
                        <td>
                          <span className={`ui-badge ${p.isActive ? 'ui-badge-cash' : 'ui-badge-transfer'}`}>
                            {p.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td>
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(p.id)}>
                            Edit
                          </Button>
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

      {view === 'form' && (
        <form onSubmit={handleSubmit}>
          <Panel title={editingId ? 'Edit Produk' : 'Tambah Produk Baru'}>
            <ProductFormFields
              form={form}
              onChange={setForm}
              categories={categories}
              isEdit={!!editingId}
            />
            {editingId && (
              <p className="pos-form-hint">
                Perubahan stok dicatat otomatis di StockMovements (penyesuaian).
              </p>
            )}
            <div className="ui-actions-row">
              <Button
                variant="secondary"
                type="button"
                onClick={() => { setView('list'); setEditingId(null) }}
              >
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Produk'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
