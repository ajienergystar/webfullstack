import { useCallback, useEffect, useState } from 'react'
import { shiftsApi } from '../../api/shifts'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
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
  userId: '',
  openTime: '',
  closeTime: '',
  openingCash: '',
  closingCash: '',
}

export default function ShiftKasir() {
  const [view, setView] = useState('list')
  const [formData, setFormData] = useState(null)
  const [shiftList, setShiftList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadList = useCallback(async () => {
    setShiftList(await shiftsApi.list())
  }, [])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [meta, list] = await Promise.all([
        shiftsApi.getFormData(),
        shiftsApi.list(),
      ])
      setFormData(meta)
      setShiftList(list)
    } catch (err) {
      setError(err.message)
      setFormData(null)
      setShiftList(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setForm({
      userId: formData?.users?.length ? String(formData.users[0].id) : '',
      openTime: nowDatetimeLocal(),
      closeTime: '',
      openingCash: '',
      closingCash: '',
    })
    setView('form')
    setError('')
    setSuccess('')
  }

  const openEdit = async (id) => {
    setError('')
    setSuccess('')
    try {
      const shift = await shiftsApi.getById(id)
      setEditingId(id)
      setForm({
        userId: shift.userId ? String(shift.userId) : '',
        openTime: toDatetimeLocalValue(shift.openTime),
        closeTime: shift.closeTime ? toDatetimeLocalValue(shift.closeTime) : '',
        openingCash: shift.openingCash != null ? String(shift.openingCash) : '',
        closingCash: shift.closingCash != null ? String(shift.closingCash) : '',
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.userId) {
      setError('Kasir wajib dipilih.')
      return
    }
    if (!form.openTime) {
      setError('Waktu buka shift wajib diisi.')
      return
    }
    if (form.openingCash === '' || Number.isNaN(Number(form.openingCash))) {
      setError('Kas awal wajib diisi.')
      return
    }
    if (form.closeTime && form.openTime && new Date(form.closeTime) < new Date(form.openTime)) {
      setError('Waktu tutup tidak boleh lebih awal dari waktu buka.')
      return
    }

    const payload = {
      userId: Number(form.userId),
      openTime: fromDatetimeLocalValue(form.openTime),
      closeTime: fromDatetimeLocalValue(form.closeTime),
      openingCash: Number(form.openingCash),
      closingCash: form.closingCash !== '' ? Number(form.closingCash) : null,
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await shiftsApi.update(editingId, payload)
        setSuccess('Data shift kasir berhasil diperbarui.')
      } else {
        await shiftsApi.create(payload)
        setSuccess('Shift kasir baru berhasil ditambahkan.')
      }
      resetForm()
      await loadList()
      setView('list')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openShifts = shiftList?.shifts?.filter((s) => !s.closeTime) ?? []

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Shift Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { resetForm(); setView('list'); setError('') }}
    >
      ← Daftar Shift
    </Button>
  )

  return (
    <PageShell
      title="Shift Kasir"
      description="Kelola buka/tutup shift kasir — tabel CashierShifts (POS)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data shift kasir..."
      error={!formData ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi (database/pos/init.sql)."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && formData && <div className="ui-alert ui-alert-error">{error}</div>}

      {formData && view === 'list' && (
        <>
          {shiftList && (
            <div className="pos-stat-row">
              <StatCard label="Total Shift" value={shiftList.totalCount} />
              <StatCard label="Shift Aktif" value={openShifts.length} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Kasir</th>
                    <th>Waktu Buka</th>
                    <th>Waktu Tutup</th>
                    <th>Kas Awal</th>
                    <th>Kas Tutup</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!shiftList?.shifts?.length ? (
                    <tr>
                      <td colSpan={7} className="ui-table-empty">
                        Belum ada data shift kasir
                      </td>
                    </tr>
                  ) : (
                    shiftList.shifts.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <span className="pos-ref-link">{s.userFullName || s.username}</span>
                          {s.userFullName && s.username && (
                            <span style={{ color: '#888', fontSize: '0.85rem', display: 'block' }}>
                              @{s.username}
                            </span>
                          )}
                        </td>
                        <td>{formatDateTime(s.openTime)}</td>
                        <td>{s.closeTime ? formatDateTime(s.closeTime) : '—'}</td>
                        <td>{formatRupiah(s.openingCash)}</td>
                        <td>{s.closingCash != null ? formatRupiah(s.closingCash) : '—'}</td>
                        <td>
                          <span className={s.closeTime ? 'ui-badge ui-badge-muted' : 'ui-badge ui-badge-success'}>
                            {s.closeTime ? 'Selesai' : 'Aktif'}
                          </span>
                        </td>
                        <td>
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => openEdit(s.id)}
                          >
                            Edit
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

      {formData && view === 'form' && (
        <form onSubmit={handleSubmit}>
          <Panel title={editingId ? 'Edit Shift Kasir' : 'Buka Shift Kasir Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Kasir *">
                <select
                  value={form.userId}
                  onChange={(e) => updateField('userId', e.target.value)}
                  required
                >
                  <option value="">— Pilih kasir —</option>
                  {formData.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username}
                      {u.fullName && u.username ? ` (@${u.username})` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Waktu Buka Shift *">
                <input
                  type="datetime-local"
                  value={form.openTime}
                  onChange={(e) => updateField('openTime', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Waktu Tutup Shift">
                <input
                  type="datetime-local"
                  value={form.closeTime}
                  onChange={(e) => updateField('closeTime', e.target.value)}
                />
              </FormField>
              <FormField label="Kas Awal (Opening Cash) *">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Contoh: 500000"
                  value={form.openingCash}
                  onChange={(e) => updateField('openingCash', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Kas Tutup (Closing Cash)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Diisi saat tutup shift"
                  value={form.closingCash}
                  onChange={(e) => updateField('closingCash', e.target.value)}
                />
              </FormField>
            </div>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              Kosongkan waktu tutup jika shift masih berjalan. Kas tutup diisi saat menutup shift.
            </p>
            <div className="ui-actions-row">
              <Button
                variant="secondary"
                type="button"
                onClick={() => { resetForm(); setView('list'); setError('') }}
              >
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Shift'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
