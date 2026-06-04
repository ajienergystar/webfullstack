import { useCallback, useEffect, useState } from 'react'
import { taxesApi } from '../../api/taxes'
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
import { formatDateTime } from '../../utils/format'

const TAX_TYPES = [
  { value: 'PPN', label: 'PPN' },
  { value: 'SERVICE_CHARGE', label: 'Service Charge' },
  { value: 'OTHER', label: 'Lainnya' },
]

const emptyForm = {
  taxCode: '',
  taxName: '',
  taxType: 'PPN',
  taxRate: '',
  isInclusive: false,
  isDefault: false,
  isActive: true,
  description: '',
}

function typeLabel(type) {
  const found = TAX_TYPES.find((t) => t.value === type)
  return found?.label || type
}

export default function Pajak() {
  const [view, setView] = useState('list')
  const [listData, setListData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editingCreatedAt, setEditingCreatedAt] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    const data = await taxesApi.list({
      search: search || undefined,
      taxType: typeFilter || undefined,
      isActive: activeFilter === '' ? undefined : activeFilter === 'true',
    })
    setListData(data)
  }, [search, typeFilter, activeFilter])

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
    setEditingCreatedAt(null)
    setForm({ ...emptyForm })
    setView('form')
    setError('')
    setSuccess('')
  }

  const openEdit = async (id) => {
    setError('')
    try {
      const record = await taxesApi.get(id)
      setEditingId(id)
      setEditingCreatedAt(record.createdAt || null)
      setForm({
        taxCode: record.taxCode || '',
        taxName: record.taxName || '',
        taxType: record.taxType || 'PPN',
        taxRate: String(record.taxRate ?? ''),
        isInclusive: Boolean(record.isInclusive),
        isDefault: Boolean(record.isDefault),
        isActive: Boolean(record.isActive),
        description: record.description || '',
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.taxCode.trim()) {
      setError('Kode pajak wajib diisi.')
      return
    }
    if (!form.taxName.trim()) {
      setError('Nama pajak wajib diisi.')
      return
    }
    const taxRate = Number(form.taxRate)
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      setError('Tarif pajak harus antara 0 dan 100.')
      return
    }

    const payload = {
      taxCode: form.taxCode.trim(),
      taxName: form.taxName.trim(),
      taxType: form.taxType,
      taxRate,
      isInclusive: form.isInclusive,
      isDefault: form.isDefault,
      isActive: form.isActive,
      description: form.description.trim() || null,
    }

    setSubmitting(true)
    setError('')
    try {
      const result = editingId
        ? await taxesApi.update(editingId, payload)
        : await taxesApi.create(payload)
      setSuccess(
        editingId
          ? `Pajak "${result.taxName}" berhasil diperbarui.`
          : `Pajak "${result.taxName}" berhasil ditambahkan.`,
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus pajak "${name}"?`)) return
    setDeletingId(id)
    setError('')
    try {
      await taxesApi.delete(id)
      setSuccess(`Pajak "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Tambah Pajak
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
      title="Pajak"
      description="Kelola master pajak: PPN, service charge, dan tarif lainnya (tabel Taxes)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data pajak..."
      error={!listData && error ? error : undefined}
      errorHint="Pastikan tabel Taxes sudah dibuat (tax-tables.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Total Konfigurasi" value={listData.totalCount} />
            <StatCard label="Aktif" value={listData.activeCount} />
          </div>

          <Panel title="Daftar Pajak">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="Kode, nama, atau keterangan"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Jenis">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">Semua jenis</option>
                  {TAX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
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
                  <TableTh>Kode</TableTh>
                  <TableTh>Nama Pajak</TableTh>
                  <TableTh>Jenis</TableTh>
                  <TableTh align="right">Tarif</TableTh>
                  <TableTh>Inklusif</TableTh>
                  <TableTh>Default</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!listData.taxes?.length ? (
                  <TableEmpty colSpan={8}>Belum ada data pajak</TableEmpty>
                ) : (
                  listData.taxes.map((row) => (
                    <TableRow key={row.id}>
                      <TableTd><TableLink>{row.taxCode}</TableLink></TableTd>
                      <TableTd>
                        <strong>{row.taxName}</strong>
                        {row.description && <TableSubtext>{row.description}</TableSubtext>}
                      </TableTd>
                      <TableTd>{typeLabel(row.taxType)}</TableTd>
                      <TableTd align="right">{row.taxRate}%</TableTd>
                      <TableTd>{row.isInclusive ? 'Ya' : 'Tidak'}</TableTd>
                      <TableTd>
                        {row.isDefault ? <TableBadge variant="default">Default</TableBadge> : <span className="ui-table-cell-muted">—</span>}
                      </TableTd>
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
                          disabled={deletingId === row.id || row.isDefault}
                          onClick={() => handleDelete(row.id, row.taxName)}
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
          <Panel title={editingId ? 'Edit Pajak' : 'Tambah Pajak Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Kode Pajak *">
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Contoh: PPN-11"
                  value={form.taxCode}
                  onChange={(e) => updateField('taxCode', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Nama Pajak *">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Contoh: PPN 11%"
                  value={form.taxName}
                  onChange={(e) => updateField('taxName', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Jenis Pajak *">
                <select
                  value={form.taxType}
                  onChange={(e) => updateField('taxType', e.target.value)}
                  required
                >
                  {TAX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tarif (%) *">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="11"
                  value={form.taxRate}
                  onChange={(e) => updateField('taxRate', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Harga Sudah Termasuk Pajak">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '2.5rem' }}>
                  <input
                    type="checkbox"
                    checked={form.isInclusive}
                    onChange={(e) => updateField('isInclusive', e.target.checked)}
                  />
                  <span>Pajak inklusif (sudah termasuk dalam harga jual)</span>
                </label>
              </FormField>
              <FormField label="Jadikan Default">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '2.5rem' }}>
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => updateField('isDefault', e.target.checked)}
                  />
                  <span>Dipakai otomatis di kasir</span>
                </label>
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
              <FormField label="Keterangan" className="ui-form-grid-span-3">
                <textarea
                  rows={3}
                  maxLength={255}
                  placeholder="Catatan tambahan (opsional)"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </FormField>
            </div>
            {editingId && editingCreatedAt && (
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                Dibuat: {formatDateTime(editingCreatedAt)}
              </p>
            )}
            <div className="ui-actions-row">
              <Button variant="secondary" type="button" onClick={() => setView('list')}>
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Pajak'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
