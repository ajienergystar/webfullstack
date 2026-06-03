import { useCallback, useEffect, useState } from 'react'
import { categoriesApi } from '../../api/categories'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'

const emptyForm = { categoryName: '' }

export default function MasterKategori() {
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    const data = await categoriesApi.list({ search: search || undefined })
    setListData(data)
  }, [search])

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
      const cat = await categoriesApi.getById(id)
      setEditingId(id)
      setForm({ categoryName: cat.categoryName })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.categoryName.trim()) {
      setError('Nama kategori wajib diisi.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = { categoryName: form.categoryName.trim() }
      const result = editingId
        ? await categoriesApi.update(editingId, payload)
        : await categoriesApi.create(payload)
      setSuccess(
        editingId
          ? `Kategori "${result.categoryName}" berhasil diperbarui.`
          : `Kategori baru: ${result.categoryName}`
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
      setError(`Kategori "${name}" masih dipakai ${productCount} produk.`)
      return
    }
    if (!window.confirm(`Hapus kategori "${name}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await categoriesApi.remove(id)
      setSuccess(`Kategori "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const totalProducts = listData?.categories?.reduce((s, c) => s + c.productCount, 0) ?? 0

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Kategori Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Kategori
    </Button>
  )

  return (
    <PageShell
      title="Kategori Produk"
      description="Categories — nama kategori untuk pengelompokan produk"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat kategori..."
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
              <FormField label="Cari Nama Kategori">
                <input
                  type="text"
                  placeholder="Minuman, Makanan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {listData && (
            <div className="pos-stat-row">
              <StatCard label="Total Kategori" value={listData.totalCount} />
              <StatCard label="Produk Terkait" value={totalProducts} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Kategori</th>
                    <th>Jumlah Produk</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.categories?.length ? (
                    <tr>
                      <td colSpan={4} className="ui-table-empty">Belum ada kategori</td>
                    </tr>
                  ) : (
                    listData.categories.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td className="pos-ref-link">{c.categoryName}</td>
                        <td>{c.productCount}</td>
                        <td className="pos-table-actions">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(c.id)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            disabled={deletingId === c.id || c.productCount > 0}
                            title={c.productCount > 0 ? 'Masih dipakai produk' : 'Hapus kategori'}
                            onClick={() => handleDelete(c.id, c.categoryName, c.productCount)}
                          >
                            {deletingId === c.id ? '...' : 'Hapus'}
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
          <Panel title={editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Kategori *">
                <input
                  type="text"
                  placeholder="Contoh: Minuman"
                  value={form.categoryName}
                  onChange={(e) => setForm({ categoryName: e.target.value })}
                  maxLength={100}
                  required
                />
              </FormField>
            </div>
            <p className="pos-form-hint">
              Maks. 100 karakter. Nama kategori harus unik.
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
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Kategori'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
