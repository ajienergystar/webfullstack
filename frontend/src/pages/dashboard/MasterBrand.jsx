import { useCallback, useEffect, useState } from 'react'
import { brandsApi } from '../../api/brands'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'

const emptyForm = { brandName: '', description: '', isActive: true }

export default function MasterBrand() {
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    const params = { search: search || undefined }
    if (activeFilter === 'active') params.isActive = true
    if (activeFilter === 'inactive') params.isActive = false
    const data = await brandsApi.list(params)
    setListData(data)
  }, [search, activeFilter])

  useEffect(() => {
    loadList()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setSuccess('')
    setView('form')
  }

  const openEdit = async (id) => {
    setError('')
    setSuccess('')
    try {
      const brand = await brandsApi.getById(id)
      setEditingId(id)
      setForm({
        brandName: brand.brandName,
        description: brand.description || '',
        isActive: brand.isActive !== false,
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.brandName.trim()) {
      setError('Nama brand wajib diisi.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        brandName: form.brandName.trim(),
        description: form.description.trim() || null,
        isActive: form.isActive,
      }
      const result = editingId
        ? await brandsApi.update(editingId, payload)
        : await brandsApi.create(payload)
      setSuccess(
        editingId
          ? `Brand "${result.brandName}" berhasil diperbarui.`
          : `Brand baru: ${result.brandName}`
      )
      await loadList()
      setView('list')
      setEditingId(null)
      setForm(emptyForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, name, productCount) => {
    if (productCount > 0) {
      setError(`Brand "${name}" masih dipakai ${productCount} produk.`)
      return
    }
    if (!window.confirm(`Hapus brand "${name}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await brandsApi.remove(id)
      setSuccess(`Brand "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const totalProducts = listData?.brands?.reduce((s, b) => s + b.productCount, 0) ?? 0

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Brand Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Brand
    </Button>
  )

  return (
    <PageShell
      title="Brand / Merk"
      description="Brands — nama merk, deskripsi, dan status aktif"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat brand..."
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
                  placeholder="Nama brand, deskripsi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
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
              <StatCard label="Total Brand" value={listData.totalCount} />
              <StatCard label="Brand Aktif" value={listData.activeCount} />
              <StatCard label="Produk Terkait" value={totalProducts} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Brand</th>
                    <th>Deskripsi</th>
                    <th>Produk</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.brands?.length ? (
                    <tr>
                      <td colSpan={6} className="ui-table-empty">Belum ada brand</td>
                    </tr>
                  ) : (
                    listData.brands.map((b) => (
                      <tr key={b.id} className={!b.isActive ? 'pos-row-inactive' : undefined}>
                        <td>{b.id}</td>
                        <td className="pos-ref-link">{b.brandName}</td>
                        <td>{b.description || '—'}</td>
                        <td>{b.productCount}</td>
                        <td>
                          <span className={`ui-badge ${b.isActive ? 'ui-badge-cash' : 'ui-badge-transfer'}`}>
                            {b.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="pos-table-actions">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(b.id)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            disabled={deletingId === b.id || b.productCount > 0}
                            title={b.productCount > 0 ? 'Masih dipakai produk' : 'Hapus brand'}
                            onClick={() => handleDelete(b.id, b.brandName, b.productCount)}
                          >
                            {deletingId === b.id ? '...' : 'Hapus'}
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
          <Panel title={editingId ? 'Edit Brand' : 'Tambah Brand Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Brand / Merk *">
                <input
                  type="text"
                  placeholder="Contoh: Indofood"
                  value={form.brandName}
                  onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField label="Deskripsi">
                <input
                  type="text"
                  placeholder="Keterangan singkat (opsional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={255}
                />
              </FormField>
              <FormField label="Status">
                <label className="pos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Aktif
                </label>
              </FormField>
            </div>
            <p className="pos-form-hint">
              Nama brand harus unik. Brand nonaktif tidak muncul di dropdown produk.
            </p>
            <div className="ui-actions-row">
              <Button
                variant="secondary"
                type="button"
                onClick={() => { setView('list'); setEditingId(null) }}
              >
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Brand'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
