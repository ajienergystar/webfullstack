import { useCallback, useEffect, useState } from 'react'
import { usersApi } from '../../api/users'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import { formatDateTime } from '../../utils/format'

const emptyForm = {
  fullName: '',
  username: '',
  password: '',
  confirmPassword: '',
  roleId: '',
  isActive: true,
}

export default function Users() {
  const [view, setView] = useState('list')
  const [formData, setFormData] = useState(null)
  const [userList, setUserList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadList = useCallback(async () => {
    setUserList(await usersApi.list())
  }, [])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [meta, list] = await Promise.all([
        usersApi.getFormData(),
        usersApi.list(),
      ])
      setFormData(meta)
      setUserList(list)
    } catch (err) {
      setError(err.message)
      setFormData(null)
      setUserList(null)
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
    if (formData?.roles?.length) {
      setForm((prev) => ({ ...prev, roleId: String(formData.roles[0].id) }))
    }
    setView('form')
    setError('')
    setSuccess('')
  }

  const openEdit = async (id) => {
    setError('')
    setSuccess('')
    try {
      const user = await usersApi.getById(id)
      setEditingId(id)
      setForm({
        fullName: user.fullName || '',
        username: user.username || '',
        password: '',
        confirmPassword: '',
        roleId: user.roleId ? String(user.roleId) : '',
        isActive: user.isActive,
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!editingId && (!form.password || form.password.length < 6)) {
      setError('Password minimal 6 karakter.')
      return
    }
    if (form.password && form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }
    if (!form.roleId) {
      setError('Role wajib dipilih.')
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await usersApi.update(editingId, {
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          password: form.password || null,
          roleId: Number(form.roleId),
          isActive: form.isActive,
        })
        setSuccess('Data user berhasil diperbarui.')
      } else {
        const result = await usersApi.create({
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          password: form.password,
          roleId: Number(form.roleId),
          isActive: form.isActive,
        })
        setSuccess(`User "${result.username}" berhasil ditambahkan.`)
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

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + User Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { resetForm(); setView('list'); setError('') }}
    >
      ← Daftar User
    </Button>
  )

  return (
    <PageShell
      title="User"
      description="Kelola akun kasir & staff — tabel Users (POS)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data user..."
      error={!formData ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi (database/pos/init.sql)."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && formData && <div className="ui-alert ui-alert-error">{error}</div>}

      {formData && view === 'list' && (
        <>
          {userList && (
            <div className="pos-stat-row">
              <StatCard label="Total User" value={userList.totalCount} />
              <StatCard
                label="Aktif"
                value={userList.users.filter((u) => u.isActive).length}
              />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Dibuat</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!userList?.users?.length ? (
                    <tr>
                      <td colSpan={6} className="ui-table-empty">
                        Belum ada data user
                      </td>
                    </tr>
                  ) : (
                    userList.users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.fullName || '—'}</td>
                        <td className="pos-ref-link">{u.username}</td>
                        <td>{u.roleName || '—'}</td>
                        <td>
                          <span className={u.isActive ? 'ui-badge ui-badge-success' : 'ui-badge ui-badge-muted'}>
                            {u.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td>{formatDateTime(u.createdAt)}</td>
                        <td>
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => openEdit(u.id)}
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
          <Panel title={editingId ? 'Edit User' : 'Tambah User Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Lengkap *">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Nama lengkap"
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Username *">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Username login"
                  value={form.username}
                  onChange={(e) => updateField('username', e.target.value)}
                  required
                  autoComplete="off"
                />
              </FormField>
              <FormField label="Role *">
                <select
                  value={form.roleId}
                  onChange={(e) => updateField('roleId', e.target.value)}
                  required
                >
                  <option value="">— Pilih role —</option>
                  {formData.roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.roleName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label={editingId ? 'Password Baru (opsional)' : 'Password *'}>
                <input
                  type="password"
                  placeholder={editingId ? 'Kosongkan jika tidak diubah' : 'Min. 6 karakter'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  required={!editingId}
                  minLength={editingId ? undefined : 6}
                  autoComplete="new-password"
                />
              </FormField>
              <FormField label="Konfirmasi Password">
                <input
                  type="password"
                  placeholder="Ulangi password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  required={!editingId || !!form.password}
                  autoComplete="new-password"
                />
              </FormField>
              <FormField label="Status" as="div">
                <label className="ui-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => updateField('isActive', e.target.checked)}
                  />
                  User aktif
                </label>
              </FormField>
            </div>
            <div className="ui-actions-row">
              <Button
                variant="secondary"
                type="button"
                onClick={() => { resetForm(); setView('list'); setError('') }}
              >
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan User'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
