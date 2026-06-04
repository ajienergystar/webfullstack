import { useCallback, useEffect, useState } from 'react'
import { rolesApi } from '../../api/roles'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'

const emptyForm = {
  roleName: '',
  permissionIds: [],
}

export default function Roles() {
  const [view, setView] = useState('list')
  const [formData, setFormData] = useState(null)
  const [roleList, setRoleList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadList = useCallback(async () => {
    setRoleList(await rolesApi.list())
  }, [])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [meta, list] = await Promise.all([
        rolesApi.getFormData(),
        rolesApi.list(),
      ])
      setFormData(meta)
      setRoleList(list)
    } catch (err) {
      setError(err.message)
      setFormData(null)
      setRoleList(null)
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

  const togglePermission = (permissionId) => {
    setForm((prev) => {
      const ids = prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id) => id !== permissionId)
        : [...prev.permissionIds, permissionId]
      return { ...prev, permissionIds: ids }
    })
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setView('form')
    setError('')
    setSuccess('')
  }

  const openEdit = async (id) => {
    setError('')
    setSuccess('')
    try {
      const role = await rolesApi.getById(id)
      setEditingId(id)
      setForm({
        roleName: role.roleName || '',
        permissionIds: role.permissionIds || [],
      })
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id, roleName) => {
    if (!window.confirm(`Hapus role "${roleName}"?`)) return
    setDeletingId(id)
    setError('')
    try {
      await rolesApi.remove(id)
      setSuccess(`Role "${roleName}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.roleName.trim()) {
      setError('Nama role wajib diisi.')
      return
    }
    if (!form.permissionIds.length) {
      setError('Pilih minimal satu permission.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        roleName: form.roleName.trim(),
        permissionIds: form.permissionIds,
      }
      if (editingId) {
        await rolesApi.update(editingId, payload)
        setSuccess('Data role berhasil diperbarui.')
      } else {
        const result = await rolesApi.create(payload)
        setSuccess(`Role "${result.roleName}" berhasil ditambahkan.`)
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
      + Role Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { resetForm(); setView('list'); setError('') }}
    >
      ← Daftar Role
    </Button>
  )

  return (
    <PageShell
      title="Role & Permission"
      description="Kelola role dan hak akses — tabel Roles, Permissions, RolePermissions (POS)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data role..."
      error={!formData ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi (database/pos/init.sql)."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && formData && <div className="ui-alert ui-alert-error">{error}</div>}

      {formData && view === 'list' && (
        <>
          {roleList && (
            <div className="pos-stat-row">
              <StatCard label="Total Role" value={roleList.totalCount} />
              <StatCard
                label="Total Permission"
                value={formData.permissions.length}
              />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Nama Role</th>
                    <th>Permission</th>
                    <th>User</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!roleList?.roles?.length ? (
                    <tr>
                      <td colSpan={4} className="ui-table-empty">
                        Belum ada data role
                      </td>
                    </tr>
                  ) : (
                    roleList.roles.map((r) => (
                      <tr key={r.id}>
                        <td className="pos-ref-link">{r.roleName}</td>
                        <td>
                          {r.permissionNames?.length ? (
                            <span title={r.permissionNames.join(', ')}>
                              {r.permissionCount} permission
                              {' — '}
                              {r.permissionNames.join(', ')}
                            </span>
                          ) : (
                            <span className="ui-badge ui-badge-muted">Tanpa permission</span>
                          )}
                        </td>
                        <td>{r.userCount}</td>
                        <td>
                          <div className="ui-actions-row" style={{ marginTop: 0, justifyContent: 'flex-end' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={() => openEdit(r.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              type="button"
                              disabled={deletingId === r.id}
                              onClick={() => handleDelete(r.id, r.roleName)}
                            >
                              {deletingId === r.id ? '...' : 'Hapus'}
                            </Button>
                          </div>
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
          <Panel title={editingId ? 'Edit Role' : 'Tambah Role Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Role *">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Contoh: Admin, Cashier"
                  value={form.roleName}
                  onChange={(e) => updateField('roleName', e.target.value)}
                  required
                />
              </FormField>
            </div>

            <FormField label="Permission *" as="div">
              {!formData.permissions.length ? (
                <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
                  Belum ada data permission di database.
                </p>
              ) : (
                <div className="ui-form-grid ui-form-grid-3">
                  {formData.permissions.map((p) => (
                    <label key={p.id} className="ui-checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.permissionIds.includes(p.id)}
                        onChange={() => togglePermission(p.id)}
                      />
                      {p.permissionName}
                    </label>
                  ))}
                </div>
              )}
            </FormField>

            <div className="ui-actions-row">
              <Button
                variant="secondary"
                type="button"
                onClick={() => { resetForm(); setView('list'); setError('') }}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting || !formData.permissions.length}
              >
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Role'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
