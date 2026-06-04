import { useCallback, useEffect, useState } from 'react'
import { hutangPiutangApi } from '../../api/hutangPiutang'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import { todayStr } from '../../utils/date'
import { formatRupiah } from '../../utils/format'

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

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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

export default function CustomerHutang() {
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
    setForm(emptyForm)
    setSalesOptions([])
    setError('')
    setSuccess('')
    try {
      const list = await loadCustomers()
      if (!list.length) {
        setError('Belum ada pelanggan. Tambahkan pelanggan di Data Pelanggan terlebih dahulu.')
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
      if (!list.length) setCustomers(list)
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

    setSubmitting(true)
    setError('')
    try {
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
      const result = editingId
        ? await hutangPiutangApi.update(editingId, payload)
        : await hutangPiutangApi.create(payload)
      setSuccess(
        editingId
          ? `Catatan "${result.referenceNumber}" berhasil diperbarui.`
          : `Catatan baru: ${result.referenceNumber}`
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
      + Catatan Baru
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
      ← Daftar Hutang / Piutang
    </Button>
  )

  return (
    <PageShell
      title="Hutang / Piutang"
      description="CustomerHutangPiutang — piutang pelanggan dan hutang toko ke pelanggan"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data hutang/piutang..."
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
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {listData && (
            <div className="pos-stat-row">
              <StatCard label="Total Catatan" value={listData.totalCount} />
              <StatCard label="Sisa Piutang" value={formatRupiah(listData.totalPiutangBalance)} />
              <StatCard label="Sisa Hutang" value={formatRupiah(listData.totalHutangBalance)} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Referensi</th>
                    <th>Pelanggan</th>
                    <th>Tipe</th>
                    <th>Nominal</th>
                    <th>Terbayar</th>
                    <th>Sisa</th>
                    <th>Tanggal</th>
                    <th>Jatuh Tempo</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.records?.length ? (
                    <tr>
                      <td colSpan={10} className="ui-table-empty">
                        Belum ada catatan hutang/piutang
                      </td>
                    </tr>
                  ) : (
                    listData.records.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.referenceNumber}</strong></td>
                        <td className="pos-ref-link">{r.customerName}</td>
                        <td>{typeLabel(r.type)}</td>
                        <td>{formatRupiah(r.amount)}</td>
                        <td>{formatRupiah(r.paidAmount)}</td>
                        <td><strong>{formatRupiah(r.balance)}</strong></td>
                        <td>{formatDate(r.recordDate)}</td>
                        <td>{formatDate(r.dueDate)}</td>
                        <td>
                          <span className={
                            r.status === 'PAID'
                              ? 'ui-badge ui-badge-cash'
                              : r.status === 'CANCELLED'
                                ? 'ui-badge ui-badge-transfer'
                                : 'ui-badge'
                          }>
                            {statusLabel(r.status)}
                          </span>
                        </td>
                        <td className="pos-table-actions">
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
                            {deletingId === r.id ? '...' : 'Hapus'}
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
          <Panel title={editingId ? 'Edit Hutang / Piutang' : 'Tambah Catatan Hutang / Piutang'}>
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
                  min="0.01"
                  step="0.01"
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
                  step="0.01"
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
                      {s.invoiceNumber} — {formatRupiah(s.grandTotal)} ({formatDate(s.transactionDate)})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Deskripsi" className="pos-field-full">
                <input
                  type="text"
                  placeholder="Keterangan singkat"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={255}
                />
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
              Kolom sesuai tabel CustomerHutangPiutang: ReferenceNumber, CustomerId, Type, Amount,
              PaidAmount, RecordDate, DueDate, SalesTransactionId, Status, Description, Notes.
              Status otomatis disesuaikan dari nominal dan terbayar (kecuali Dibatalkan).
            </p>
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
