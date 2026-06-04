import { useCallback, useEffect, useState } from 'react'
import { expensesApi } from '../../api/expenses'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  DataTable,
  TableActions,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '../../components/ui/Table'
import { formatDateTime, formatRupiah } from '../../utils/format'

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function nowDatetimeLocal() {
  return toDatetimeLocalValue(new Date().toISOString())
}

function fromDatetimeLocalValue(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

const emptyForm = {
  expenseName: '',
  amount: '',
  expenseDate: nowDatetimeLocal(),
  notes: '',
}

export default function Pengeluaran() {
  const [view, setView] = useState('list')
  const [listData, setListData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    const data = await expensesApi.list({
      search: search || undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
    })
    setListData(data)
  }, [search, dateFrom, dateTo])

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
    setForm({ ...emptyForm, expenseDate: nowDatetimeLocal() })
    setView('form')
    setError('')
    setSuccess('')
  }

  const openEdit = async (id) => {
    setError('')
    try {
      const record = await expensesApi.get(id)
      setEditingId(id)
      setForm({
        expenseName: record.expenseName || '',
        amount: String(record.amount ?? ''),
        expenseDate: toDatetimeLocalValue(record.expenseDate),
        notes: record.notes || '',
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.expenseName.trim()) {
      setError('Nama pengeluaran wajib diisi.')
      return
    }
    const amount = Number(form.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Nominal harus lebih dari 0.')
      return
    }
    if (!form.expenseDate) {
      setError('Tanggal pengeluaran wajib diisi.')
      return
    }

    const payload = {
      expenseName: form.expenseName.trim(),
      amount,
      expenseDate: fromDatetimeLocalValue(form.expenseDate),
      notes: form.notes.trim() || null,
    }

    setSubmitting(true)
    setError('')
    try {
      const result = editingId
        ? await expensesApi.update(editingId, payload)
        : await expensesApi.create(payload)
      setSuccess(
        editingId
          ? `Pengeluaran "${result.expenseName}" berhasil diperbarui.`
          : `Pengeluaran "${result.expenseName}" berhasil dicatat.`,
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
    if (!window.confirm(`Hapus pengeluaran "${name}"?`)) return
    setDeletingId(id)
    setError('')
    try {
      await expensesApi.delete(id)
      setSuccess(`Pengeluaran "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Catat Pengeluaran
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
      title="Pengeluaran"
      description="Catat dan kelola pengeluaran operasional (tabel Expenses)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data pengeluaran..."
      error={!listData && error ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi (init.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Jumlah Catatan" value={listData.totalCount} />
            <StatCard label="Total Pengeluaran" value={formatRupiah(listData.totalAmount)} />
          </div>

          <Panel title="Daftar Pengeluaran">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="Nama atau keterangan"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Dari tanggal">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </FormField>
              <FormField label="Sampai tanggal">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </FormField>
            </div>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>Tanggal</TableTh>
                  <TableTh>Nama Pengeluaran</TableTh>
                  <TableTh align="right">Nominal</TableTh>
                  <TableTh>Keterangan</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!listData.expenses?.length ? (
                  <TableEmpty colSpan={5}>Belum ada data pengeluaran</TableEmpty>
                ) : (
                  listData.expenses.map((row) => (
                    <TableRow key={row.id}>
                      <TableTd>{formatDateTime(row.expenseDate)}</TableTd>
                      <TableTd emphasize>{row.expenseName}</TableTd>
                      <TableTd align="right" emphasize>{formatRupiah(row.amount)}</TableTd>
                      <TableTd muted={!row.notes}>{row.notes || '—'}</TableTd>
                      <TableActions>
                        <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(row.id)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => handleDelete(row.id, row.expenseName)}
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
          <Panel title={editingId ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Pengeluaran *">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Contoh: Listrik, Gaji, Sewa"
                  value={form.expenseName}
                  onChange={(e) => updateField('expenseName', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Nominal *">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => updateField('amount', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Tanggal & Waktu *">
                <input
                  type="datetime-local"
                  value={form.expenseDate}
                  onChange={(e) => updateField('expenseDate', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Keterangan" className="ui-form-grid-span-3">
                <textarea
                  rows={3}
                  maxLength={255}
                  placeholder="Catatan tambahan (opsional)"
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </FormField>
            </div>
            <div className="ui-actions-row">
              <Button variant="secondary" type="button" onClick={() => setView('list')}>
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
