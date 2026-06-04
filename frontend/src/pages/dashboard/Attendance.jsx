import { useCallback, useEffect, useState } from 'react'
import { attendanceApi } from '../../api/attendance'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import { formatDateTime } from '../../utils/format'

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toDateValue(isoOrDateString) {
  if (!isoOrDateString) return ''
  const d = new Date(isoOrDateString)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function nowDatetimeLocal() {
  return toDatetimeLocalValue(new Date().toISOString())
}

function todayDateValue() {
  return toDateValue(new Date().toISOString())
}

function fromDatetimeLocalValue(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

const STATUS_LABELS = {
  Present: 'Hadir',
  Late: 'Terlambat',
  Absent: 'Tidak Hadir',
  Leave: 'Cuti / Izin',
  HalfDay: 'Setengah Hari',
}

const STATUS_BADGE = {
  Present: 'ui-badge-success',
  Late: 'ui-badge-warning',
  Absent: 'ui-badge-danger',
  Leave: 'ui-badge-muted',
  HalfDay: 'ui-badge-muted',
}

const emptyForm = {
  userId: '',
  outletId: '',
  attendanceDate: '',
  clockIn: '',
  clockOut: '',
  status: 'Present',
  notes: '',
}

export default function Attendance() {
  const [view, setView] = useState('list')
  const [formData, setFormData] = useState(null)
  const [recordList, setRecordList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadList = useCallback(async () => {
    setRecordList(await attendanceApi.list())
  }, [])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [meta, list] = await Promise.all([
        attendanceApi.getFormData(),
        attendanceApi.list(),
      ])
      setFormData(meta)
      setRecordList(list)
    } catch (err) {
      setError(err.message)
      setFormData(null)
      setRecordList(null)
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
      outletId: formData?.outlets?.length ? String(formData.outlets[0].id) : '',
      attendanceDate: todayDateValue(),
      clockIn: nowDatetimeLocal(),
      clockOut: '',
      status: 'Present',
      notes: '',
    })
    setView('form')
    setError('')
    setSuccess('')
  }

  const openEdit = async (id) => {
    setError('')
    setSuccess('')
    try {
      const record = await attendanceApi.getById(id)
      setEditingId(id)
      setForm({
        userId: record.userId ? String(record.userId) : '',
        outletId: record.outletId ? String(record.outletId) : '',
        attendanceDate: toDateValue(record.attendanceDate),
        clockIn: toDatetimeLocalValue(record.clockIn),
        clockOut: record.clockOut ? toDatetimeLocalValue(record.clockOut) : '',
        status: record.status || 'Present',
        notes: record.notes || '',
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
      setError('Karyawan wajib dipilih.')
      return
    }
    if (!form.attendanceDate) {
      setError('Tanggal attendance wajib diisi.')
      return
    }
    if (!form.clockIn) {
      setError('Jam masuk wajib diisi.')
      return
    }
    if (!form.status) {
      setError('Status wajib dipilih.')
      return
    }
    if (form.clockOut && form.clockIn && new Date(form.clockOut) < new Date(form.clockIn)) {
      setError('Jam keluar tidak boleh lebih awal dari jam masuk.')
      return
    }

    const payload = {
      userId: Number(form.userId),
      outletId: form.outletId ? Number(form.outletId) : null,
      attendanceDate: form.attendanceDate,
      clockIn: fromDatetimeLocalValue(form.clockIn),
      clockOut: fromDatetimeLocalValue(form.clockOut),
      status: form.status,
      notes: form.notes.trim() || null,
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await attendanceApi.update(editingId, payload)
        setSuccess('Data attendance berhasil diperbarui.')
      } else {
        await attendanceApi.create(payload)
        setSuccess('Data attendance baru berhasil ditambahkan.')
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

  const todayStr = todayDateValue()
  const todayRecords = recordList?.records?.filter(
    (r) => toDateValue(r.attendanceDate) === todayStr
  ) ?? []
  const activeRecords = recordList?.records?.filter((r) => !r.clockOut) ?? []

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Attendance Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { resetForm(); setView('list'); setError('') }}
    >
      ← Daftar Attendance
    </Button>
  )

  return (
    <PageShell
      title="Attendance"
      description="Kelola kehadiran karyawan — tabel Attendances (POS)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data attendance..."
      error={!formData ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi (database/pos/attendance-tables.sql)."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && formData && <div className="ui-alert ui-alert-error">{error}</div>}

      {formData && view === 'list' && (
        <>
          {recordList && (
            <div className="pos-stat-row">
              <StatCard label="Total Record" value={recordList.totalCount} />
              <StatCard label="Hari Ini" value={todayRecords.length} />
              <StatCard label="Belum Clock Out" value={activeRecords.length} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Karyawan</th>
                    <th>Outlet</th>
                    <th>Tanggal</th>
                    <th>Jam Masuk</th>
                    <th>Jam Keluar</th>
                    <th>Status</th>
                    <th>Catatan</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!recordList?.records?.length ? (
                    <tr>
                      <td colSpan={8} className="ui-table-empty">
                        Belum ada data attendance
                      </td>
                    </tr>
                  ) : (
                    recordList.records.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="pos-ref-link">{r.userFullName || r.username}</span>
                          {r.userFullName && r.username && (
                            <span style={{ color: '#888', fontSize: '0.85rem', display: 'block' }}>
                              @{r.username}
                            </span>
                          )}
                        </td>
                        <td>{r.outletName || '—'}</td>
                        <td>{toDateValue(r.attendanceDate)}</td>
                        <td>{formatDateTime(r.clockIn)}</td>
                        <td>{r.clockOut ? formatDateTime(r.clockOut) : '—'}</td>
                        <td>
                          <span className={`ui-badge ${STATUS_BADGE[r.status] || 'ui-badge-muted'}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td>{r.notes || '—'}</td>
                        <td>
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => openEdit(r.id)}
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
          <Panel title={editingId ? 'Edit Attendance' : 'Tambah Attendance Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Karyawan *">
                <select
                  value={form.userId}
                  onChange={(e) => updateField('userId', e.target.value)}
                  required
                >
                  <option value="">— Pilih karyawan —</option>
                  {formData.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username}
                      {u.fullName && u.username ? ` (@${u.username})` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Outlet">
                <select
                  value={form.outletId}
                  onChange={(e) => updateField('outletId', e.target.value)}
                >
                  <option value="">— Tanpa outlet —</option>
                  {formData.outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tanggal Attendance *">
                <input
                  type="date"
                  value={form.attendanceDate}
                  onChange={(e) => updateField('attendanceDate', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Jam Masuk (Clock In) *">
                <input
                  type="datetime-local"
                  value={form.clockIn}
                  onChange={(e) => updateField('clockIn', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Jam Keluar (Clock Out)">
                <input
                  type="datetime-local"
                  value={form.clockOut}
                  onChange={(e) => updateField('clockOut', e.target.value)}
                />
              </FormField>
              <FormField label="Status *">
                <select
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  required
                >
                  {(formData.statusOptions || ['Present', 'Late', 'Absent', 'Leave', 'HalfDay']).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Catatan">
                <textarea
                  rows={3}
                  maxLength={255}
                  placeholder="Catatan tambahan (opsional)"
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </FormField>
            </div>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              Kosongkan jam keluar jika karyawan belum clock out. Status: Hadir, Terlambat, Tidak Hadir, Cuti/Izin, Setengah Hari.
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
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Attendance'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
