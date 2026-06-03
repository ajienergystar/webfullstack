import { useCallback, useEffect, useState } from 'react'
import { suppliersApi } from '../../api/suppliers'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'

const emptyForm = {
  supplierName: '',
  address: '',
  phoneNumber: '',
  email: '',
}

export default function MasterSupplier() {
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
    const data = await suppliersApi.list({ search: search || undefined })
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
      const s = await suppliersApi.getById(id)
      setEditingId(id)
      setForm({
        supplierName: s.supplierName || '',
        address: s.address || '',
        phoneNumber: s.phoneNumber || '',
        email: s.email || '',
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.supplierName.trim()) {
      setError('Nama supplier wajib diisi.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        supplierName: form.supplierName.trim(),
        address: form.address.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
        email: form.email.trim() || null,
      }
      const result = editingId
        ? await suppliersApi.update(editingId, payload)
        : await suppliersApi.create(payload)
      setSuccess(
        editingId
          ? `Supplier "${result.supplierName}" berhasil diperbarui.`
          : `Supplier baru: ${result.supplierName}`
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

  const handleDelete = async (id, name, purchaseCount) => {
    if (purchaseCount > 0) {
      setError(`Supplier "${name}" masih dipakai ${purchaseCount} pembelian.`)
      return
    }
    if (!window.confirm(`Hapus supplier "${name}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await suppliersApi.remove(id)
      setSuccess(`Supplier "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const totalPurchases = listData?.suppliers?.reduce((s, x) => s + x.purchaseCount, 0) ?? 0

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Supplier Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Supplier
    </Button>
  )

  return (
    <PageShell
      title="Supplier"
      description="Suppliers — nama, alamat, telepon, dan email pemasok"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat supplier..."
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
                  placeholder="Nama, alamat, telepon, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {listData && (
            <div className="pos-stat-row">
              <StatCard label="Total Supplier" value={listData.totalCount} />
              <StatCard label="Transaksi Pembelian" value={totalPurchases} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Supplier</th>
                    <th>Alamat</th>
                    <th>Telepon</th>
                    <th>Email</th>
                    <th>Pembelian</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.suppliers?.length ? (
                    <tr>
                      <td colSpan={7} className="ui-table-empty">Belum ada supplier</td>
                    </tr>
                  ) : (
                    listData.suppliers.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td className="pos-ref-link">{s.supplierName}</td>
                        <td>{s.address || '—'}</td>
                        <td>{s.phoneNumber || '—'}</td>
                        <td>{s.email || '—'}</td>
                        <td>{s.purchaseCount}</td>
                        <td className="pos-table-actions">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(s.id)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            disabled={deletingId === s.id || s.purchaseCount > 0}
                            title={s.purchaseCount > 0 ? 'Masih dipakai pembelian' : 'Hapus supplier'}
                            onClick={() => handleDelete(s.id, s.supplierName, s.purchaseCount)}
                          >
                            {deletingId === s.id ? '...' : 'Hapus'}
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
          <Panel title={editingId ? 'Edit Supplier' : 'Tambah Supplier Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Supplier *">
                <input
                  type="text"
                  placeholder="PT Sumber Pangan"
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField label="Telepon">
                <input
                  type="text"
                  placeholder="08123456789"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  maxLength={20}
                />
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  placeholder="supplier@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={100}
                />
              </FormField>
              <FormField label="Alamat" className="pos-field-full">
                <input
                  type="text"
                  placeholder="Alamat lengkap"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  maxLength={255}
                />
              </FormField>
            </div>
            <p className="pos-form-hint">
              Nama supplier harus unik. Hapus hanya jika belum dipakai di modul Pembelian.
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
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Supplier'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
