import { useCallback, useEffect, useState } from 'react'
import { outletsApi } from '../../api/outlets'
import { paymentGatewaysApi } from '../../api/paymentGateways'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import { PAYMENT_METHODS } from '../../constants/pos'

const PROVIDERS = [
  { value: 'Midtrans', label: 'Midtrans' },
  { value: 'Xendit', label: 'Xendit' },
  { value: 'Doku', label: 'Doku' },
  { value: 'Stripe', label: 'Stripe' },
  { value: 'Manual', label: 'Manual / Offline' },
]

const ENVIRONMENTS = [
  { value: 'Sandbox', label: 'Sandbox (Uji Coba)' },
  { value: 'Production', label: 'Production (Live)' },
]

const GATEWAY_METHODS = PAYMENT_METHODS.filter((m) => m !== 'Cash')

const PROVIDER_LABELS = Object.fromEntries(PROVIDERS.map((p) => [p.value, p.label]))

const emptyForm = {
  gatewayName: '',
  provider: 'Midtrans',
  merchantId: '',
  clientKey: '',
  serverKey: '',
  environment: 'Sandbox',
  supportedMethods: ['QRIS', 'Transfer'],
  callbackUrl: '',
  outletId: '',
  isDefault: false,
  isActive: true,
}

function parseMethods(value) {
  if (!value) return []
  return value.split(',').map((m) => m.trim()).filter(Boolean)
}

function mapToForm(data) {
  return {
    gatewayName: data.gatewayName || '',
    provider: data.provider || 'Midtrans',
    merchantId: data.merchantId || '',
    clientKey: data.clientKey || '',
    serverKey: data.serverKey || '',
    environment: data.environment || 'Sandbox',
    supportedMethods: parseMethods(data.supportedMethods),
    callbackUrl: data.callbackUrl || '',
    outletId: data.outletId ? String(data.outletId) : '',
    isDefault: Boolean(data.isDefault),
    isActive: data.isActive !== false,
  }
}

function toggleMethod(methods, method) {
  return methods.includes(method)
    ? methods.filter((m) => m !== method)
    : [...methods, method]
}

export default function PaymentGatewaySetting() {
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [outlets, setOutlets] = useState([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [outletFilter, setOutletFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadList = useCallback(async () => {
    const params = { search: search || undefined }
    if (activeFilter === 'active') params.isActive = true
    if (activeFilter === 'inactive') params.isActive = false
    if (providerFilter) params.provider = providerFilter
    if (outletFilter) params.outletId = Number(outletFilter)
    const data = await paymentGatewaysApi.list(params)
    setListData(data)
  }, [search, activeFilter, providerFilter, outletFilter])

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
      const gateway = await paymentGatewaysApi.getById(id)
      setEditingId(id)
      setForm(mapToForm(gateway))
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.gatewayName.trim()) {
      setError('Nama gateway wajib diisi.')
      return
    }
    if (!form.supportedMethods.length) {
      setError('Pilih minimal satu metode pembayaran.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        gatewayName: form.gatewayName.trim(),
        provider: form.provider,
        merchantId: form.merchantId.trim() || null,
        clientKey: form.clientKey.trim() || null,
        serverKey: form.serverKey.trim() || null,
        environment: form.environment,
        supportedMethods: form.supportedMethods.join(','),
        callbackUrl: form.callbackUrl.trim() || null,
        outletId: form.outletId ? Number(form.outletId) : null,
        isDefault: form.isDefault,
        isActive: form.isActive,
      }
      const result = editingId
        ? await paymentGatewaysApi.update(editingId, payload)
        : await paymentGatewaysApi.create(payload)
      setSuccess(
        editingId
          ? `Gateway "${result.gatewayName}" berhasil diperbarui.`
          : `Gateway baru: ${result.gatewayName}`
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
      setError(`Gateway "${name}" adalah default dan tidak dapat dihapus.`)
      return
    }
    if (!window.confirm(`Hapus payment gateway "${name}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await paymentGatewaysApi.remove(id)
      setSuccess(`Gateway "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Gateway Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Gateway
    </Button>
  )

  return (
    <PageShell
      title="Payment Gateway"
      description="PaymentGateways — konfigurasi integrasi Midtrans, Xendit, dan provider lain"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat konfigurasi payment gateway..."
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
                  placeholder="Nama gateway, provider, merchant ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Provider">
                <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
                  <option value="">Semua</option>
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
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
              <StatCard label="Total Gateway" value={listData.totalCount} />
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
                    <th>Nama Gateway</th>
                    <th>Provider</th>
                    <th>Environment</th>
                    <th>Metode</th>
                    <th>Outlet</th>
                    <th>Server Key</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.gateways?.length ? (
                    <tr>
                      <td colSpan={9} className="ui-table-empty">Belum ada payment gateway terdaftar</td>
                    </tr>
                  ) : (
                    listData.gateways.map((g) => (
                      <tr key={g.id} className={!g.isActive ? 'pos-row-inactive' : undefined}>
                        <td>{g.id}</td>
                        <td className="pos-ref-link">
                          {g.gatewayName}
                          {g.isDefault && (
                            <span className="ui-badge ui-badge-cash" style={{ marginLeft: '0.5rem' }}>
                              Default
                            </span>
                          )}
                        </td>
                        <td>{PROVIDER_LABELS[g.provider] || g.provider}</td>
                        <td>
                          <span className={`ui-badge ${g.environment === 'Production' ? 'ui-badge-cash' : 'ui-badge-transfer'}`}>
                            {g.environment}
                          </span>
                        </td>
                        <td>{g.supportedMethods?.replace(/,/g, ', ') || '—'}</td>
                        <td>{g.outletName || 'Semua outlet'}</td>
                        <td>{g.serverKeyMasked || '—'}</td>
                        <td>
                          <span className={`ui-badge ${g.isActive ? 'ui-badge-cash' : 'ui-badge-transfer'}`}>
                            {g.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="pos-table-actions">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(g.id)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            disabled={deletingId === g.id || g.isDefault}
                            title={g.isDefault ? 'Gateway default tidak dapat dihapus' : 'Hapus gateway'}
                            onClick={() => handleDelete(g.id, g.gatewayName, g.isDefault)}
                          >
                            {deletingId === g.id ? '...' : 'Hapus'}
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
          <Panel title={editingId ? 'Edit Payment Gateway' : 'Tambah Payment Gateway Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Gateway *">
                <input
                  type="text"
                  placeholder="Contoh: Midtrans QRIS & EDC"
                  value={form.gatewayName}
                  onChange={(e) => setForm({ ...form, gatewayName: e.target.value })}
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField label="Provider *">
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Environment *">
                <select
                  value={form.environment}
                  onChange={(e) => setForm({ ...form, environment: e.target.value })}
                >
                  {ENVIRONMENTS.map((env) => (
                    <option key={env.value} value={env.value}>{env.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Merchant ID">
                <input
                  type="text"
                  placeholder="G123456789"
                  value={form.merchantId}
                  onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
                  maxLength={100}
                />
              </FormField>
              <FormField label="Client Key / Public Key">
                <input
                  type="text"
                  placeholder="SB-Mid-client-xxxxxxxx"
                  value={form.clientKey}
                  onChange={(e) => setForm({ ...form, clientKey: e.target.value })}
                  maxLength={255}
                />
              </FormField>
              <FormField label="Server Key / Secret Key">
                <input
                  type="password"
                  placeholder={editingId ? 'Kosongkan jika tidak diubah' : 'SB-Mid-server-xxxxxxxx'}
                  value={form.serverKey}
                  onChange={(e) => setForm({ ...form, serverKey: e.target.value })}
                  maxLength={255}
                  autoComplete="new-password"
                />
              </FormField>
              <FormField label="Callback URL" className="ui-form-grid-span-2">
                <input
                  type="url"
                  placeholder="https://domain.com/api/payments/callback"
                  value={form.callbackUrl}
                  onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })}
                  maxLength={500}
                />
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
              <FormField label="Metode Pembayaran *" className="ui-form-grid-span-3">
                <div className="pos-checkbox-group">
                  {GATEWAY_METHODS.map((method) => (
                    <label key={method} className="pos-checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.supportedMethods.includes(method)}
                        onChange={() => setForm({
                          ...form,
                          supportedMethods: toggleMethod(form.supportedMethods, method),
                        })}
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </FormField>
              <FormField label="Gateway Default">
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
              Gunakan environment Sandbox untuk uji coba sebelum Production.
              Server Key disimpan terenkripsi di database dan ditampilkan ter-mask di daftar.
              Hanya satu gateway default per outlet.
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
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Gateway'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
