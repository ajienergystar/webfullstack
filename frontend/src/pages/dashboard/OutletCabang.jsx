import { useCallback, useEffect, useState } from 'react'
import { outletsApi } from '../../api/outlets'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'

const emptyForm = { outletName: '', address: '', phoneNumber: '' }

export default function OutletCabang() {
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
    const data = await outletsApi.list({ search: search || undefined })
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
      const outlet = await outletsApi.getById(id)
      setEditingId(id)
      setForm({
        outletName: outlet.outletName || '',
        address: outlet.address || '',
        phoneNumber: outlet.phoneNumber || '',
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.outletName.trim()) {
      setError('Nama cabang wajib diisi.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        outletName: form.outletName.trim(),
        address: form.address.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
      }
      const result = editingId
        ? await outletsApi.update(editingId, payload)
        : await outletsApi.create(payload)
      setSuccess(
        editingId
          ? `Cabang "${result.outletName}" berhasil diperbarui.`
          : `Cabang baru: ${result.outletName}`
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

  const handleDelete = async (id, name, referenceCount) => {
    if (referenceCount > 0) {
      setError(`Cabang "${name}" masih dipakai di ${referenceCount} data.`)
      return
    }
    if (!window.confirm(`Hapus cabang "${name}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await outletsApi.remove(id)
      setSuccess(`Cabang "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const totalReferences = listData?.outlets?.reduce((s, o) => s + o.referenceCount, 0) ?? 0

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Cabang Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Cabang
    </Button>
  )

  return (
    <PageShell
      title="Manajemen Cabang"
      description="Outlets — data cabang/outlet untuk transaksi multi-lokasi"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data cabang..."
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
              <FormField label="Cari Cabang">
                <input
                  type="text"
                  placeholder="Nama, alamat, telepon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {listData && (
            <div className="pos-stat-row">
              <StatCard label="Total Cabang" value={listData.totalCount} />
              <StatCard label="Data Terkait" value={totalReferences} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Cabang</th>
                    <th>Alamat</th>
                    <th>Telepon</th>
                    <th>Data Terkait</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.outlets?.length ? (
                    <tr>
                      <td colSpan={6} className="ui-table-empty">Belum ada cabang</td>
                    </tr>
                  ) : (
                    listData.outlets.map((o) => (
                      <tr key={o.id}>
                        <td>{o.id}</td>
                        <td className="pos-ref-link">{o.outletName}</td>
                        <td>{o.address || '—'}</td>
                        <td>{o.phoneNumber || '—'}</td>
                        <td>{o.referenceCount}</td>
                        <td className="pos-table-actions">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(o.id)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            disabled={deletingId === o.id || o.referenceCount > 0}
                            title={o.referenceCount > 0 ? 'Masih dipakai data transaksi' : 'Hapus cabang'}
                            onClick={() => handleDelete(o.id, o.outletName, o.referenceCount)}
                          >
                            {deletingId === o.id ? '...' : 'Hapus'}
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
          <Panel title={editingId ? 'Edit Cabang' : 'Tambah Cabang Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Cabang *">
                <input
                  type="text"
                  placeholder="Contoh: Outlet Semarang"
                  value={form.outletName}
                  onChange={(e) => setForm({ ...form, outletName: e.target.value })}
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField label="Nomor Telepon">
                <input
                  type="tel"
                  placeholder="08123456789"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  maxLength={20}
                />
              </FormField>
              <FormField label="Alamat" className="pos-field-full">
                <input
                  type="text"
                  placeholder="Alamat lengkap cabang"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  maxLength={255}
                />
              </FormField>
            </div>
            <p className="pos-form-hint">
              Kolom sesuai tabel Outlets: OutletName (wajib), Address, PhoneNumber. Nama cabang harus unik.
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
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Cabang'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
