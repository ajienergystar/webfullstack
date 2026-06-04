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

export default function CustomerLoyalty() {
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [search, setSearch] = useState('')
  const [minPoints, setMinPoints] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const loadList = useCallback(async () => {
    const data = await customersApi.list({ search: search || undefined })
    const min = minPoints !== '' ? Number(minPoints) : null
    const customers = min !== null && !Number.isNaN(min)
      ? data.customers.filter((c) => c.loyaltyPoint >= min)
      : data.customers
    setListData({
      ...data,
      customers,
      totalCount: customers.length,
      totalLoyaltyPoints: customers.reduce((sum, c) => sum + c.loyaltyPoint, 0),
    })
  }, [search, minPoints])

  useEffect(() => {
    loadList()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList])

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
    const points = Number(form.loyaltyPoint)
    if (Number.isNaN(points) || points < 0) {
      setError('Loyalty point tidak boleh negatif.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        customerName: form.customerName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        address: form.address.trim() || null,
        loyaltyPoint: points,
      }
      const result = await customersApi.update(editingId, payload)
      setSuccess(`Loyalty point pelanggan "${result.customerName}" berhasil disimpan (${points} poin).`)
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

  const listActions = view === 'list' ? null : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Loyalty Point
    </Button>
  )

  return (
    <PageShell
      title="Loyalty Point"
      description="Customers.LoyaltyPoint — kelola poin loyalitas pelanggan"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data loyalty point..."
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
              <FormField label="Cari Pelanggan">
                <input
                  type="text"
                  placeholder="Nama, telepon, alamat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Min. Poin">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minPoints}
                  onChange={(e) => setMinPoints(e.target.value)}
                />
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {listData && (
            <div className="pos-stat-row">
              <StatCard label="Pelanggan" value={listData.totalCount} />
              <StatCard label="Total Loyalty Point" value={listData.totalLoyaltyPoints} />
              <StatCard
                label="Rata-rata Poin"
                value={
                  listData.totalCount > 0
                    ? Math.round(listData.totalLoyaltyPoints / listData.totalCount)
                    : 0
                }
              />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Pelanggan</th>
                    <th>Telepon</th>
                    <th>Alamat</th>
                    <th>Loyalty Point</th>
                    <th>Transaksi</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.customers?.length ? (
                    <tr>
                      <td colSpan={7} className="ui-table-empty">
                        Tidak ada pelanggan yang cocok dengan filter
                      </td>
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
                          <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            onClick={() => openEdit(c.id)}
                          >
                            Atur Point
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
          <Panel title="Kelola Loyalty Point">
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="ID Pelanggan">
                <input type="text" value={editingId ?? ''} readOnly disabled />
              </FormField>
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
              <FormField label="Loyalty Point *">
                <input
                  type="number"
                  min="0"
                  value={form.loyaltyPoint}
                  onChange={(e) => setForm({ ...form, loyaltyPoint: e.target.value })}
                  required
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
              Kolom sesuai tabel Customers: CustomerName, PhoneNumber, Address, LoyaltyPoint.
              Nomor telepon harus unik jika diisi.
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
                {submitting ? 'Menyimpan...' : 'Simpan Loyalty Point'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
