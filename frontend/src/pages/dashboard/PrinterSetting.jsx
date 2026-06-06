import { useCallback, useEffect, useState } from 'react'
import { outletsApi } from '../../api/outlets'
import { printersApi } from '../../api/printers'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'

const CONNECTION_TYPES = [
  { value: 'USB', label: 'USB' },
  { value: 'Bluetooth', label: 'Bluetooth' },
  { value: 'Network', label: 'Network (IP)' },
]

const PAPER_WIDTHS = [
  { value: 58, label: '58 mm (thermal kecil)' },
  { value: 80, label: '80 mm (thermal standar)' },
]

const PRINTER_PURPOSES = [
  { value: 'Receipt', label: 'Struk Kasir' },
  { value: 'Kitchen', label: 'Dapur / Kitchen' },
  { value: 'Label', label: 'Label / Barcode' },
]

const PURPOSE_LABELS = Object.fromEntries(PRINTER_PURPOSES.map((p) => [p.value, p.label]))

const emptyForm = {
  printerName: '',
  connectionType: 'USB',
  ipAddress: '',
  port: '9100',
  paperWidthMm: 58,
  printerPurpose: 'Receipt',
  outletId: '',
  isDefault: false,
  isActive: true,
}

function mapToForm(data) {
  return {
    printerName: data.printerName || '',
    connectionType: data.connectionType || 'USB',
    ipAddress: data.ipAddress || '',
    port: data.port || '9100',
    paperWidthMm: data.paperWidthMm || 58,
    printerPurpose: data.printerPurpose || 'Receipt',
    outletId: data.outletId ? String(data.outletId) : '',
    isDefault: Boolean(data.isDefault),
    isActive: data.isActive !== false,
  }
}

export default function PrinterSetting() {
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [outlets, setOutlets] = useState([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [connectionFilter, setConnectionFilter] = useState('')
  const [outletFilter, setOutletFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    const params = { search: search || undefined }
    if (activeFilter === 'active') params.isActive = true
    if (activeFilter === 'inactive') params.isActive = false
    if (connectionFilter) params.connectionType = connectionFilter
    if (outletFilter) params.outletId = Number(outletFilter)
    const data = await printersApi.list(params)
    setListData(data)
  }, [search, activeFilter, connectionFilter, outletFilter])

  const loadOutlets = useCallback(async () => {
    const data = await outletsApi.list({})
    setOutlets(data.outlets || [])
  }, [])

  useEffect(() => {
    Promise.all([loadList(), loadOutlets()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList, loadOutlets])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setSuccess('')
    setView('form')
  }

  const openEdit = async (id) => {
    setError('')
    setSuccess('')
    try {
      const printer = await printersApi.getById(id)
      setEditingId(id)
      setForm(mapToForm(printer))
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.printerName.trim()) {
      setError('Nama printer wajib diisi.')
      return
    }
    if (form.connectionType === 'Network' && !form.ipAddress.trim()) {
      setError('Alamat IP wajib diisi untuk printer Network.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        printerName: form.printerName.trim(),
        connectionType: form.connectionType,
        ipAddress: form.connectionType === 'Network' ? form.ipAddress.trim() : null,
        port: form.connectionType === 'Network' ? (form.port.trim() || '9100') : null,
        paperWidthMm: Number(form.paperWidthMm),
        printerPurpose: form.printerPurpose,
        outletId: form.outletId ? Number(form.outletId) : null,
        isDefault: form.isDefault,
        isActive: form.isActive,
      }
      const result = editingId
        ? await printersApi.update(editingId, payload)
        : await printersApi.create(payload)
      setSuccess(
        editingId
          ? `Printer "${result.printerName}" berhasil diperbarui.`
          : `Printer baru: ${result.printerName}`
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

  const handleDelete = async (id, name, isDefault) => {
    if (isDefault) {
      setError(`Printer "${name}" adalah default dan tidak dapat dihapus.`)
      return
    }
    if (!window.confirm(`Hapus printer "${name}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await printersApi.remove(id)
      setSuccess(`Printer "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Printer Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Printer
    </Button>
  )

  return (
    <PageShell
      title="Printer"
      description="Printers — konfigurasi printer struk, dapur, dan label per outlet"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat konfigurasi printer..."
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
                  placeholder="Nama printer, IP, outlet..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Koneksi">
                <select value={connectionFilter} onChange={(e) => setConnectionFilter(e.target.value)}>
                  <option value="">Semua</option>
                  {CONNECTION_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Outlet">
                <select value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)}>
                  <option value="">Semua</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                  <option value="">Semua</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </FormField>
              <Button variant="primary" type="submit">Cari</Button>
            </form>
          </Panel>

          {listData && (
            <div className="pos-stat-row">
              <StatCard label="Total Printer" value={listData.totalCount} />
              <StatCard label="Aktif" value={listData.activeCount} />
              <StatCard label="Default" value={listData.defaultCount} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Printer</th>
                    <th>Koneksi</th>
                    <th>Alamat / IP</th>
                    <th>Kertas</th>
                    <th>Fungsi</th>
                    <th>Outlet</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.printers?.length ? (
                    <tr>
                      <td colSpan={9} className="ui-table-empty">Belum ada printer terdaftar</td>
                    </tr>
                  ) : (
                    listData.printers.map((p) => (
                      <tr key={p.id} className={!p.isActive ? 'pos-row-inactive' : undefined}>
                        <td>{p.id}</td>
                        <td className="pos-ref-link">
                          {p.printerName}
                          {p.isDefault && (
                            <span className="ui-badge ui-badge-cash" style={{ marginLeft: '0.5rem' }}>
                              Default
                            </span>
                          )}
                        </td>
                        <td>{p.connectionType}</td>
                        <td>
                          {p.connectionType === 'Network'
                            ? `${p.ipAddress || '—'}${p.port ? `:${p.port}` : ''}`
                            : '—'}
                        </td>
                        <td>{p.paperWidthMm} mm</td>
                        <td>{PURPOSE_LABELS[p.printerPurpose] || p.printerPurpose}</td>
                        <td>{p.outletName || 'Semua outlet'}</td>
                        <td>
                          <span className={`ui-badge ${p.isActive ? 'ui-badge-cash' : 'ui-badge-transfer'}`}>
                            {p.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="pos-table-actions">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(p.id)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            disabled={deletingId === p.id || p.isDefault}
                            title={p.isDefault ? 'Printer default tidak dapat dihapus' : 'Hapus printer'}
                            onClick={() => handleDelete(p.id, p.printerName, p.isDefault)}
                          >
                            {deletingId === p.id ? '...' : 'Hapus'}
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
          <Panel title={editingId ? 'Edit Printer' : 'Tambah Printer Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Printer *">
                <input
                  type="text"
                  placeholder="Contoh: Kasir Struk 58mm"
                  value={form.printerName}
                  onChange={(e) => setForm({ ...form, printerName: e.target.value })}
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField label="Tipe Koneksi *">
                <select
                  value={form.connectionType}
                  onChange={(e) => setForm({ ...form, connectionType: e.target.value })}
                >
                  {CONNECTION_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Fungsi Printer *">
                <select
                  value={form.printerPurpose}
                  onChange={(e) => setForm({ ...form, printerPurpose: e.target.value })}
                >
                  {PRINTER_PURPOSES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </FormField>
              {form.connectionType === 'Network' && (
                <>
                  <FormField label="Alamat IP *">
                    <input
                      type="text"
                      placeholder="192.168.1.100"
                      value={form.ipAddress}
                      onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                      maxLength={45}
                      required
                    />
                  </FormField>
                  <FormField label="Port">
                    <input
                      type="text"
                      placeholder="9100"
                      value={form.port}
                      onChange={(e) => setForm({ ...form, port: e.target.value })}
                      maxLength={10}
                    />
                  </FormField>
                </>
              )}
              <FormField label="Lebar Kertas *">
                <select
                  value={form.paperWidthMm}
                  onChange={(e) => setForm({ ...form, paperWidthMm: Number(e.target.value) })}
                >
                  {PAPER_WIDTHS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Outlet">
                <select
                  value={form.outletId}
                  onChange={(e) => setForm({ ...form, outletId: e.target.value })}
                >
                  <option value="">Semua outlet</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Printer Default">
                <label className="pos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  />
                  Jadikan default untuk outlet ini
                </label>
              </FormField>
              <FormField label="Status">
                <label className="pos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Aktif
                </label>
              </FormField>
            </div>
            <p className="pos-form-hint">
              Printer Network membutuhkan alamat IP. Port default ESC/POS biasanya 9100.
              Hanya satu printer default per outlet.
            </p>
            <div className="ui-actions-row">
              <Button
                variant="secondary"
                type="button"
                onClick={() => { setView('list'); setEditingId(null) }}
              >
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Printer'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
