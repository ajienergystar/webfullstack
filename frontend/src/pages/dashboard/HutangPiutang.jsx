import { useCallback, useEffect, useState } from 'react'
import { hutangPiutangApi } from '../../api/hutangPiutang'
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
  badgeVariantRecordStatus,
} from '../../components/ui/Table'
import { todayStr } from '../../utils/date'
import { formatDateTime, formatRupiah } from '../../utils/format'

const TYPES = [
  { value: 'PIUTANG', label: 'Piutang (pelanggan berhutang)' },
  { value: 'HUTANG', label: 'Hutang (toko berhutang ke pelanggan)' },
]

const STATUSES = ['OPEN', 'PARTIAL', 'PAID', 'CANCELLED']

const emptyForm = {
  referenceNumber: '',
  customerId: '',
  type: 'PIUTANG',
  amount: '',
  paidAmount: '0',
  recordDate: todayStr(),
  dueDate: '',
  salesTransactionId: '',
  status: 'OPEN',
  description: '',
  notes: '',
}

function toInputDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function statusLabel(status) {
  const map = {
    OPEN: 'Belum lunas',
    PARTIAL: 'Sebagian',
    PAID: 'Lunas',
    CANCELLED: 'Dibatalkan',
  }
  return map[status] || status
}

function typeLabel(type) {
  return type === 'PIUTANG' ? 'Piutang' : 'Hutang'
}

export default function HutangPiutang() {
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [customers, setCustomers] = useState([])
  const [salesOptions, setSalesOptions] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    const data = await hutangPiutangApi.list({
      search: search || undefined,
      type: typeFilter || undefined,
      status: statusFilter || undefined,
    })
    setListData(data)
  }, [search, typeFilter, statusFilter])

  useEffect(() => {
    setLoading(true)
    setError('')
    loadList()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList])

  const loadCustomers = async () => {
    const list = await hutangPiutangApi.customers()
    setCustomers(list)
    return list
  }

  const loadSalesOptions = async (customerId) => {
    if (!customerId) {
      setSalesOptions([])
      return
    }
    const list = await hutangPiutangApi.salesOptions(Number(customerId))
    setSalesOptions(list)
  }

  const openCreate = async () => {
    setEditingId(null)
    setForm({ ...emptyForm, recordDate: todayStr() })
    setSalesOptions([])
    setError('')
    setSuccess('')
    try {
      const list = await loadCustomers()
      if (!list.length) {
        setError('Belum ada pelanggan. Tambahkan data pelanggan terlebih dahulu.')
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
      const [record, list] = await Promise.all([
        hutangPiutangApi.getById(id),
        loadCustomers(),
      ])
      setEditingId(id)
      setForm({
        referenceNumber: record.referenceNumber || '',
        customerId: String(record.customerId),
        type: record.type || 'PIUTANG',
        amount: String(record.amount ?? ''),
        paidAmount: String(record.paidAmount ?? 0),
        recordDate: toInputDate(record.recordDate),
        dueDate: toInputDate(record.dueDate),
        salesTransactionId: record.salesTransactionId ? String(record.salesTransactionId) : '',
        status: record.status || 'OPEN',
        description: record.description || '',
        notes: record.notes || '',
      })
      if (!list.length) setCustomers(list)
      await loadSalesOptions(record.customerId)
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCustomerChange = async (customerId) => {
    setForm((prev) => ({
      ...prev,
      customerId,
      salesTransactionId: '',
    }))
    try {
      await loadSalesOptions(customerId)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.referenceNumber.trim()) {
      setError('Nomor referensi wajib diisi.')
      return
    }
    if (!form.customerId) {
      setError('Pelanggan wajib dipilih.')
      return
    }
    const amount = Number(form.amount)
    const paidAmount = Number(form.paidAmount) || 0
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Nominal harus lebih dari 0.')
      return
    }
    if (Number.isNaN(paidAmount) || paidAmount < 0 || paidAmount > amount) {
      setError('Jumlah terbayar tidak valid.')
      return
    }

    const payload = {
      referenceNumber: form.referenceNumber.trim().toUpperCase(),
      customerId: Number(form.customerId),
      type: form.type,
      amount,
      paidAmount,
      recordDate: new Date(`${form.recordDate}T00:00:00`).toISOString(),
      dueDate: form.dueDate
        ? new Date(`${form.dueDate}T00:00:00`).toISOString()
        : null,
      salesTransactionId: form.salesTransactionId ? Number(form.salesTransactionId) : null,
      status: form.status,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
    }

    setSubmitting(true)
    setError('')
    try {
      const result = editingId
        ? await hutangPiutangApi.update(editingId, payload)
        : await hutangPiutangApi.create(payload)
      setSuccess(
        editingId
          ? `Catatan "${result.referenceNumber}" berhasil diperbarui.`
          : `Catatan "${result.referenceNumber}" berhasil dicatat.`,
      )
      await loadList()
      setView('list')
      setEditingId(null)
      setForm(emptyForm)
      setSalesOptions([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, ref) => {
    if (!window.confirm(`Hapus catatan "${ref}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await hutangPiutangApi.remove(id)
      setSuccess(`Catatan "${ref}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const balancePreview = (() => {
    const amount = Number(form.amount) || 0
    const paid = Number(form.paidAmount) || 0
    return Math.max(amount - paid, 0)
  })()

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Catatan Hutang/Piutang
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => {
        setView('list')
        setEditingId(null)
        setError('')
        setSalesOptions([])
      }}
    >
      ← Kembali
    </Button>
  )

  return (
    <PageShell
      title="Hutang Piutang"
      description="Kelola piutang pelanggan dan hutang toko (tabel CustomerHutangPiutang)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data hutang piutang..."
      error={!listData && error ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi dan migrasi hutang-piutang-tables.sql dijalankan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Total Catatan" value={listData.totalCount} />
            <StatCard label="Sisa Piutang" value={formatRupiah(listData.totalPiutangBalance)} />
            <StatCard label="Sisa Hutang" value={formatRupiah(listData.totalHutangBalance)} />
          </div>

          <Panel title="Daftar Hutang & Piutang">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="Referensi, pelanggan, invoice..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Tipe">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">Semua tipe</option>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Semua status</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>Referensi</TableTh>
                  <TableTh>Pelanggan</TableTh>
                  <TableTh>Tipe</TableTh>
                  <TableTh align="right">Nominal</TableTh>
                  <TableTh align="right">Terbayar</TableTh>
                  <TableTh align="right">Sisa</TableTh>
                  <TableTh>Tanggal</TableTh>
                  <TableTh>Jatuh Tempo</TableTh>
                  <TableTh>Invoice</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!listData.records?.length ? (
                  <TableEmpty colSpan={11}>Belum ada catatan hutang/piutang</TableEmpty>
                ) : (
                  listData.records.map((r) => (
                    <TableRow key={r.id}>
                      <TableTd emphasize>{r.referenceNumber}</TableTd>
                      <TableTd>
                        <TableLink>{r.customerName}</TableLink>
                        {r.phoneNumber && <TableSubtext>{r.phoneNumber}</TableSubtext>}
                      </TableTd>
                      <TableTd>{typeLabel(r.type)}</TableTd>
                      <TableTd align="right">{formatRupiah(r.amount)}</TableTd>
                      <TableTd align="right">{formatRupiah(r.paidAmount)}</TableTd>
                      <TableTd align="right" emphasize>{formatRupiah(r.balance)}</TableTd>
                      <TableTd>{formatDateTime(r.recordDate)}</TableTd>
                      <TableTd muted={!r.dueDate}>{r.dueDate ? formatDateTime(r.dueDate) : '—'}</TableTd>
                      <TableTd muted={!r.invoiceNumber}>{r.invoiceNumber || '—'}</TableTd>
                      <TableTd>
                        <TableBadge variant={badgeVariantRecordStatus(r.status)}>
                          {statusLabel(r.status)}
                        </TableBadge>
                      </TableTd>
                      <TableActions>
                        <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(r.id)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r.id, r.referenceNumber)}
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
          <Panel title={editingId ? 'Edit Hutang / Piutang' : 'Catat Hutang / Piutang Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nomor Referensi *">
                <input
                  type="text"
                  placeholder="HP-20260604-001"
                  value={form.referenceNumber}
                  onChange={(e) => setForm({ ...form, referenceNumber: e.target.value.toUpperCase() })}
                  maxLength={50}
                  required
                />
              </FormField>
              <FormField label="Pelanggan *">
                <select
                  value={form.customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  required
                >
                  <option value="">— Pilih pelanggan —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerName}
                      {c.phoneNumber ? ` (${c.phoneNumber})` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tipe *">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Nominal (Rp) *">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="500000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Terbayar (Rp)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.paidAmount}
                  onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                />
              </FormField>
              <FormField label="Sisa">
                <input type="text" value={formatRupiah(balancePreview)} readOnly disabled />
              </FormField>
              <FormField label="Tanggal Catatan *">
                <input
                  type="date"
                  value={form.recordDate}
                  onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Jatuh Tempo">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  min={form.recordDate || undefined}
                />
              </FormField>
              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Transaksi Penjualan">
                <select
                  value={form.salesTransactionId}
                  onChange={(e) => setForm({ ...form, salesTransactionId: e.target.value })}
                  disabled={!form.customerId}
                >
                  <option value="">— Tidak terkait transaksi —</option>
                  {salesOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.invoiceNumber} — {formatRupiah(s.grandTotal)} ({formatDateTime(s.transactionDate)})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Deskripsi" className="ui-form-grid-span-3">
                <input
                  type="text"
                  placeholder="Keterangan singkat"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={255}
                />
              </FormField>
              <FormField label="Catatan" className="ui-form-grid-span-3">
                <textarea
                  rows={3}
                  placeholder="Catatan tambahan (opsional)"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  maxLength={255}
                />
              </FormField>
            </div>
            <div className="ui-actions-row">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setView('list')
                  setEditingId(null)
                  setSalesOptions([])
                }}
              >
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Catatan'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
