import { useCallback, useEffect, useState } from 'react'
import { membershipsApi } from '../../api/memberships'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import { todayStr } from '../../utils/date'

const MEMBER_LEVELS = ['Bronze', 'Silver', 'Gold', 'Platinum']

const emptyForm = {
  customerId: '',
  memberCode: '',
  memberLevel: 'Bronze',
  joinDate: todayStr(),
  expiredDate: '',
  isActive: true,
  notes: '',
}

function toInputDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function CustomerMembership() {
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)

  const [availableCustomers, setAvailableCustomers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    const data = await membershipsApi.list({
      search: search || undefined,
      level: levelFilter || undefined,
      activeOnly: activeOnly || undefined,
    })
    setListData(data)
  }, [search, levelFilter, activeOnly])

  useEffect(() => {
    loadList()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList])

  const loadAvailableCustomers = async () => {
    const customers = await membershipsApi.availableCustomers()
    setAvailableCustomers(customers)
    return customers
  }

  const openCreate = async () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setSuccess('')
    try {
      const customers = await loadAvailableCustomers()
      if (!customers.length) {
        setError('Semua pelanggan sudah memiliki membership. Tambah pelanggan baru di Data Pelanggan.')
        return
      }
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const openEdit = async (id) => {
    setError('')
    setSuccess('')
    try {
      const m = await membershipsApi.getById(id)
      setEditingId(id)
      setAvailableCustomers([{
        id: m.customerId,
        customerName: m.customerName,
        phoneNumber: m.phoneNumber,
      }])
      setForm({
        customerId: String(m.customerId),
        memberCode: m.memberCode || '',
        memberLevel: m.memberLevel || 'Bronze',
        joinDate: toInputDate(m.joinDate),
        expiredDate: toInputDate(m.expiredDate),
        isActive: m.isActive,
        notes: m.notes || '',
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customerId) {
      setError('Pelanggan wajib dipilih.')
      return
    }
    if (!form.memberCode.trim()) {
      setError('Kode member wajib diisi.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        customerId: Number(form.customerId),
        memberCode: form.memberCode.trim().toUpperCase(),
        memberLevel: form.memberLevel,
        joinDate: new Date(`${form.joinDate}T00:00:00`).toISOString(),
        expiredDate: form.expiredDate
          ? new Date(`${form.expiredDate}T00:00:00`).toISOString()
          : null,
        isActive: form.isActive,
        notes: form.notes.trim() || null,
      }
      const result = editingId
        ? await membershipsApi.update(editingId, payload)
        : await membershipsApi.create(payload)
      setSuccess(
        editingId
          ? `Membership "${result.memberCode}" berhasil diperbarui.`
          : `Membership baru: ${result.memberCode}`
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

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Hapus membership "${code}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await membershipsApi.remove(id)
      setSuccess(`Membership "${code}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Daftarkan Member
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Membership
    </Button>
  )

  return (
    <PageShell
      title="Membership"
      description="Memberships — kode member, level, tanggal bergabung, dan status aktif"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data membership..."
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
                  placeholder="Kode, nama, telepon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Level">
                <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                  <option value="">Semua level</option>
                  {MEMBER_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status" as="div">
                <label className="pos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={activeOnly}
                    onChange={(e) => setActiveOnly(e.target.checked)}
                  />
                  Hanya aktif
                </label>
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {listData && (
            <div className="pos-stat-row">
              <StatCard label="Total Member" value={listData.totalCount} />
              <StatCard label="Member Aktif" value={listData.activeCount} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Pelanggan</th>
                    <th>Telepon</th>
                    <th>Level</th>
                    <th>Bergabung</th>
                    <th>Kedaluwarsa</th>
                    <th>Loyalty</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.memberships?.length ? (
                    <tr>
                      <td colSpan={9} className="ui-table-empty">Belum ada membership</td>
                    </tr>
                  ) : (
                    listData.memberships.map((m) => (
                      <tr key={m.id}>
                        <td><strong>{m.memberCode}</strong></td>
                        <td className="pos-ref-link">{m.customerName}</td>
                        <td>{m.phoneNumber || '—'}</td>
                        <td>{m.memberLevel}</td>
                        <td>{formatDate(m.joinDate)}</td>
                        <td>{formatDate(m.expiredDate)}</td>
                        <td>{m.loyaltyPoint}</td>
                        <td>
                          <span className={m.isActive ? 'ui-badge ui-badge-cash' : 'ui-badge ui-badge-transfer'}>
                            {m.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="pos-table-actions">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(m.id)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            disabled={deletingId === m.id}
                            onClick={() => handleDelete(m.id, m.memberCode)}
                          >
                            {deletingId === m.id ? '...' : 'Hapus'}
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
          <Panel title={editingId ? 'Edit Membership' : 'Daftarkan Member Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Pelanggan *">
                <select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  required
                  disabled={!!editingId}
                >
                  <option value="">— Pilih pelanggan —</option>
                  {availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerName}
                      {c.phoneNumber ? ` (${c.phoneNumber})` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Kode Member *">
                <input
                  type="text"
                  placeholder="MEM-00003"
                  value={form.memberCode}
                  onChange={(e) => setForm({ ...form, memberCode: e.target.value.toUpperCase() })}
                  maxLength={50}
                  required
                />
              </FormField>
              <FormField label="Level Membership *">
                <select
                  value={form.memberLevel}
                  onChange={(e) => setForm({ ...form, memberLevel: e.target.value })}
                  required
                >
                  {MEMBER_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tanggal Bergabung *">
                <input
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Tanggal Kedaluwarsa">
                <input
                  type="date"
                  value={form.expiredDate}
                  onChange={(e) => setForm({ ...form, expiredDate: e.target.value })}
                  min={form.joinDate || undefined}
                />
              </FormField>
              <FormField label="Status" as="div">
                <label className="pos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Membership aktif
                </label>
              </FormField>
              <FormField label="Catatan" className="pos-field-full">
                <input
                  type="text"
                  placeholder="Catatan tambahan (opsional)"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  maxLength={255}
                />
              </FormField>
            </div>
            <p className="pos-form-hint">
              Satu pelanggan hanya boleh memiliki satu membership. Kode member harus unik.
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
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Membership'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
