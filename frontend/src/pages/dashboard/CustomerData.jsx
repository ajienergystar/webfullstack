import { useCallback, useEffect, useState } from 'react'
import { customersApi } from '../../api/customers'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'

const emptyForm = {
  customerName: '',
  phoneNumber: '',
  address: '',
  loyaltyPoint: '0',
}

export default function CustomerData() {
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
    const data = await customersApi.list({ search: search || undefined })
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
      const c = await customersApi.getById(id)
      setEditingId(id)
      setForm({
        customerName: c.customerName || '',
        phoneNumber: c.phoneNumber || '',
        address: c.address || '',
        loyaltyPoint: String(c.loyaltyPoint ?? 0),
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customerName.trim()) {
      setError('Nama pelanggan wajib diisi.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        customerName: form.customerName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        address: form.address.trim() || null,
        loyaltyPoint: Number(form.loyaltyPoint) || 0,
      }
      const result = editingId
        ? await customersApi.update(editingId, payload)
        : await customersApi.create(payload)
      setSuccess(
        editingId
          ? `Pelanggan "${result.customerName}" berhasil diperbarui.`
          : `Pelanggan baru: ${result.customerName}`
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

  const handleDelete = async (id, name, transactionCount) => {
    if (transactionCount > 0) {
      setError(`Pelanggan "${name}" masih dipakai ${transactionCount} transaksi.`)
      return
    }
    if (!window.confirm(`Hapus pelanggan "${name}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await customersApi.remove(id)
      setSuccess(`Pelanggan "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Pelanggan Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Pelanggan
    </Button>
  )

  return (
    <PageShell
      title="Data Pelanggan"
      description="Customers — nama, kontak, alamat, dan loyalty point"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data pelanggan..."
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
                  placeholder="Nama, telepon, alamat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {listData && (
            <div className="pos-stat-row">
              <StatCard label="Total Pelanggan" value={listData.totalCount} />
              <StatCard label="Total Loyalty Point" value={listData.totalLoyaltyPoints} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama</th>
                    <th>Telepon</th>
                    <th>Alamat</th>
                    <th>Loyalty</th>
                    <th>Transaksi</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.customers?.length ? (
                    <tr>
                      <td colSpan={7} className="ui-table-empty">Belum ada pelanggan</td>
                    </tr>
                  ) : (
                    listData.customers.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td className="pos-ref-link">{c.customerName}</td>
                        <td>{c.phoneNumber || '—'}</td>
                        <td>{c.address || '—'}</td>
                        <td><strong>{c.loyaltyPoint}</strong></td>
                        <td>{c.transactionCount}</td>
                        <td className="pos-table-actions">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(c.id)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            disabled={deletingId === c.id || c.transactionCount > 0}
                            title={c.transactionCount > 0 ? 'Masih dipakai transaksi' : 'Hapus pelanggan'}
                            onClick={() => handleDelete(c.id, c.customerName, c.transactionCount)}
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
          <Panel title={editingId ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Pelanggan *">
                <input
                  type="text"
                  placeholder="Nama lengkap"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField label="Telepon">
                <input
                  type="text"
                  placeholder="081234567890"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  maxLength={20}
                />
              </FormField>
              <FormField label="Loyalty Point">
                <input
                  type="number"
                  min="0"
                  value={form.loyaltyPoint}
                  onChange={(e) => setForm({ ...form, loyaltyPoint: e.target.value })}
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
              Nomor telepon harus unik jika diisi. Hapus hanya jika belum dipakai di penjualan/hold.
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
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
