import { useCallback, useEffect, useState } from 'react'
import { membershipLevelsApi } from '../../api/membershipLevels'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  DataTable,
  TableActions,
  TableBadge,
  TableBody,
  TableEmpty,
  TableHead,
  TableLink,
  TableRow,
  TableSubtext,
  TableTd,
  TableTh,
  badgeVariantActive,
} from '../../components/ui/Table'

const emptyForm = {
  levelName: '',
  minLoyaltyPoint: '0',
  discountPercent: '0',
  description: '',
  sortOrder: '0',
  isActive: true,
}

export default function MembershipLevel() {
  const [view, setView] = useState('list')
  const [listData, setListData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    const data = await membershipLevelsApi.list({
      search: search || undefined,
      isActive: activeFilter === '' ? undefined : activeFilter === 'true',
    })
    setListData(data)
  }, [search, activeFilter])

  useEffect(() => {
    setLoading(true)
    setError('')
    loadList()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setView('form')
    setError('')
    setSuccess('')
  }

  const openEdit = async (id) => {
    setError('')
    try {
      const record = await membershipLevelsApi.getById(id)
      setEditingId(id)
      setForm({
        levelName: record.levelName || '',
        minLoyaltyPoint: String(record.minLoyaltyPoint ?? 0),
        discountPercent: String(record.discountPercent ?? 0),
        description: record.description || '',
        sortOrder: String(record.sortOrder ?? 0),
        isActive: Boolean(record.isActive),
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const buildPayload = () => ({
    levelName: form.levelName.trim(),
    minLoyaltyPoint: Number(form.minLoyaltyPoint),
    discountPercent: Number(form.discountPercent),
    description: form.description.trim() || null,
    sortOrder: Number(form.sortOrder),
    isActive: form.isActive,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.levelName.trim()) {
      setError('Nama level wajib diisi.')
      return
    }
    const minPoint = Number(form.minLoyaltyPoint)
    if (Number.isNaN(minPoint) || minPoint < 0) {
      setError('Minimum loyalty point tidak boleh negatif.')
      return
    }
    const discount = Number(form.discountPercent)
    if (Number.isNaN(discount) || discount < 0 || discount > 100) {
      setError('Persentase diskon harus antara 0 dan 100.')
      return
    }
    const sortOrder = Number(form.sortOrder)
    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      setError('Urutan tampilan tidak boleh negatif.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = buildPayload()
      const result = editingId
        ? await membershipLevelsApi.update(editingId, payload)
        : await membershipLevelsApi.create(payload)
      setSuccess(
        editingId
          ? `Level "${result.levelName}" berhasil diperbarui.`
          : `Level "${result.levelName}" berhasil ditambahkan.`,
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

  const handleDelete = async (id, name, memberCount) => {
    if (memberCount > 0) {
      setError(`Level "${name}" masih dipakai ${memberCount} membership.`)
      return
    }
    if (!window.confirm(`Hapus level "${name}"?`)) return
    setDeletingId(id)
    setError('')
    try {
      await membershipLevelsApi.remove(id)
      setSuccess(`Level "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Tambah Level
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => {
        setView('list')
        setEditingId(null)
        setError('')
      }}
    >
      ← Kembali
    </Button>
  )

  return (
    <PageShell
      title="Membership Level"
      description="Kelola level membership (MembershipLevels — nama, minimum poin, diskon, urutan, status)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data level membership..."
      error={!listData && error ? error : undefined}
      errorHint="Pastikan tabel MembershipLevels sudah dibuat dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Total Level" value={listData.totalCount} />
            <StatCard label="Level Aktif" value={listData.activeCount} />
          </div>

          <Panel title="Daftar Level Membership">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="Nama level atau deskripsi"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Status">
                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                  <option value="">Semua status</option>
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </FormField>
            </div>

            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>Level</TableTh>
                  <TableTh align="right">Min. Poin</TableTh>
                  <TableTh align="right">Diskon</TableTh>
                  <TableTh>Urutan</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!listData.levels?.length ? (
                  <TableEmpty colSpan={6}>Belum ada level membership</TableEmpty>
                ) : (
                  listData.levels.map((row) => (
                    <TableRow key={row.id}>
                      <TableTd>
                        <TableLink>{row.levelName}</TableLink>
                        {row.description && <TableSubtext>{row.description}</TableSubtext>}
                      </TableTd>
                      <TableTd align="right">{row.minLoyaltyPoint.toLocaleString('id-ID')}</TableTd>
                      <TableTd align="right">{row.discountPercent}%</TableTd>
                      <TableTd>{row.sortOrder}</TableTd>
                      <TableTd>
                        <TableBadge variant={badgeVariantActive(row.isActive)}>
                          {row.isActive ? 'Aktif' : 'Nonaktif'}
                        </TableBadge>
                      </TableTd>
                      <TableActions>
                        <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(row.id)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => handleDelete(row.id, row.levelName, row.memberCount)}
                        >
                          Hapus
                        </Button>
                      </TableActions>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </DataTable>
          </Panel>
        </>
      )}

      {view === 'form' && (
        <form onSubmit={handleSubmit}>
          <Panel title={editingId ? 'Edit Level Membership' : 'Tambah Level Membership Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Level *">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Contoh: Gold"
                  value={form.levelName}
                  onChange={(e) => updateField('levelName', e.target.value)}
                  required
                  autoComplete="off"
                />
              </FormField>
              <FormField label="Minimum Loyalty Point *">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="100"
                  value={form.minLoyaltyPoint}
                  onChange={(e) => updateField('minLoyaltyPoint', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Diskon (%) *">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="10"
                  value={form.discountPercent}
                  onChange={(e) => updateField('discountPercent', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Urutan Tampilan *">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1"
                  value={form.sortOrder}
                  onChange={(e) => updateField('sortOrder', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Status">
                <select
                  value={form.isActive ? 'true' : 'false'}
                  onChange={(e) => updateField('isActive', e.target.value === 'true')}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </FormField>
              <FormField label="Deskripsi" className="ui-form-grid-span-3">
                <textarea
                  rows={3}
                  maxLength={255}
                  placeholder="Benefit atau ketentuan level ini"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </FormField>
            </div>
            <p className="pos-form-hint">
              Nama level harus unik. Minimum poin menentukan syarat kenaikan level berdasarkan loyalty point pelanggan.
              Level nonaktif tidak bisa dipilih saat mendaftarkan membership baru.
            </p>
            <div className="ui-actions-row">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setView('list')
                  setEditingId(null)
                }}
              >
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Level'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
