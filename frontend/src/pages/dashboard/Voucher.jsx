import { useCallback, useEffect, useState } from 'react'
import { vouchersApi } from '../../api/vouchers'
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
import { formatRupiah } from '../../utils/format'

const emptyForm = {
  voucherCode: '',
  discountAmount: '',
  expiredDate: '',
  isActive: true,
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

export default function Voucher() {
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
    const data = await vouchersApi.list({
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
      const record = await vouchersApi.getById(id)
      setEditingId(id)
      setForm({
        voucherCode: record.voucherCode || '',
        discountAmount: record.discountAmount != null ? String(record.discountAmount) : '',
        expiredDate: toInputDate(record.expiredDate),
        isActive: Boolean(record.isActive),
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const buildPayload = () => ({
    voucherCode: form.voucherCode.trim().toUpperCase(),
    discountAmount: Number(form.discountAmount),
    expiredDate: form.expiredDate
      ? new Date(`${form.expiredDate}T23:59:59`).toISOString()
      : null,
    isActive: form.isActive,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.voucherCode.trim()) {
      setError('Kode voucher wajib diisi.')
      return
    }
    const discountAmount = Number(form.discountAmount)
    if (Number.isNaN(discountAmount) || discountAmount <= 0) {
      setError('Nominal diskon harus lebih dari 0.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = buildPayload()
      const result = editingId
        ? await vouchersApi.update(editingId, payload)
        : await vouchersApi.create(payload)
      setSuccess(
        editingId
          ? `Voucher "${result.voucherCode}" berhasil diperbarui.`
          : `Voucher "${result.voucherCode}" berhasil ditambahkan.`,
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
    if (!window.confirm(`Hapus voucher "${code}"?`)) return
    setDeletingId(id)
    setError('')
    try {
      await vouchersApi.remove(id)
      setSuccess(`Voucher "${code}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Tambah Voucher
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
      title="Voucher"
      description="Kelola kode voucher promo (Vouchers — kode, nominal diskon, masa berlaku, status)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data voucher..."
      error={!listData && error ? error : undefined}
      errorHint="Pastikan tabel Vouchers sudah dibuat (init.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Total Voucher" value={listData.totalCount} />
            <StatCard label="Aktif & Berlaku" value={listData.activeCount} />
          </div>

          <Panel title="Daftar Voucher">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="Kode voucher"
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
                  <TableTh>Kode Voucher</TableTh>
                  <TableTh align="right">Nominal Diskon</TableTh>
                  <TableTh>Berlaku Hingga</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!listData.vouchers?.length ? (
                  <TableEmpty colSpan={5}>Belum ada voucher</TableEmpty>
                ) : (
                  listData.vouchers.map((row) => (
                    <TableRow key={row.id}>
                      <TableTd>
                        <TableLink>{row.voucherCode}</TableLink>
                        {row.isExpired && (
                          <TableSubtext>Kedaluwarsa</TableSubtext>
                        )}
                      </TableTd>
                      <TableTd align="right" amount>
                        {formatRupiah(row.discountAmount)}
                      </TableTd>
                      <TableTd>
                        {row.expiredDate ? formatDate(row.expiredDate) : 'Tanpa batas'}
                      </TableTd>
                      <TableTd>
                        <TableBadge variant={badgeVariantActive(row.isActive && !row.isExpired)}>
                          {row.isActive
                            ? row.isExpired
                              ? 'Kedaluwarsa'
                              : 'Aktif'
                            : 'Nonaktif'}
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
                          onClick={() => handleDelete(row.id, row.voucherCode)}
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
          <Panel title={editingId ? 'Edit Voucher' : 'Tambah Voucher Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Kode Voucher *">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Contoh: DISKON10"
                  value={form.voucherCode}
                  onChange={(e) => updateField('voucherCode', e.target.value.toUpperCase())}
                  required
                  autoComplete="off"
                />
              </FormField>
              <FormField label="Nominal Diskon (Rp) *">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="10000"
                  value={form.discountAmount}
                  onChange={(e) => updateField('discountAmount', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Berlaku Hingga">
                <input
                  type="date"
                  value={form.expiredDate}
                  onChange={(e) => updateField('expiredDate', e.target.value)}
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
            </div>
            <p className="pos-form-hint">
              Kode voucher harus unik. Kosongkan tanggal berlaku jika voucher tidak memiliki batas waktu.
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
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Voucher'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
