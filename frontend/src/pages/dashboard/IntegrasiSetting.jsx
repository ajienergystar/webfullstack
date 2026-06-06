import { useCallback, useEffect, useMemo, useState } from 'react'
import { outletsApi } from '../../api/outlets'
import { integrationsApi } from '../../api/integrations'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import { formatDateTime } from '../../utils/format'

const INTEGRATION_TYPES = [
  { value: 'Accounting', label: 'Akuntansi' },
  { value: 'Marketplace', label: 'Marketplace' },
  { value: 'Messaging', label: 'Pesan / Notifikasi' },
  { value: 'ECommerce', label: 'E-Commerce' },
  { value: 'Webhook', label: 'Webhook' },
]

const PROVIDERS_BY_TYPE = {
  Accounting: [
    { value: 'Jurnal', label: 'Jurnal.id' },
    { value: 'Accurate', label: 'Accurate Online' },
    { value: 'Zahir', label: 'Zahir Accounting' },
    { value: 'MyOB', label: 'MYOB' },
  ],
  Marketplace: [
    { value: 'Shopee', label: 'Shopee' },
    { value: 'Tokopedia', label: 'Tokopedia' },
    { value: 'Lazada', label: 'Lazada' },
    { value: 'Bukalapak', label: 'Bukalapak' },
  ],
  Messaging: [
    { value: 'WhatsApp', label: 'WhatsApp Business' },
    { value: 'SMS', label: 'SMS Gateway' },
    { value: 'Telegram', label: 'Telegram Bot' },
  ],
  ECommerce: [
    { value: 'WooCommerce', label: 'WooCommerce' },
    { value: 'Shopify', label: 'Shopify' },
    { value: 'PrestaShop', label: 'PrestaShop' },
  ],
  Webhook: [
    { value: 'Custom', label: 'Custom Webhook' },
  ],
}

const SYNC_DIRECTIONS = [
  { value: 'Inbound', label: 'Inbound — data masuk ke POS' },
  { value: 'Outbound', label: 'Outbound — data keluar dari POS' },
  { value: 'Bidirectional', label: 'Bidirectional — dua arah' },
]

const TYPE_LABELS = Object.fromEntries(INTEGRATION_TYPES.map((t) => [t.value, t.label]))
const SYNC_STATUS_BADGE = {
  Success: 'ui-badge-cash',
  Failed: 'ui-badge-danger',
  Pending: 'ui-badge-transfer',
  Never: 'ui-badge-transfer',
}
const SYNC_STATUS_LABELS = {
  Success: 'Berhasil',
  Failed: 'Gagal',
  Pending: 'Menunggu',
  Never: 'Belum pernah',
}

const emptyForm = {
  integrationName: '',
  integrationType: 'Accounting',
  provider: 'Jurnal',
  apiKey: '',
  apiSecret: '',
  webhookUrl: '',
  baseUrl: '',
  syncDirection: 'Bidirectional',
  notes: '',
  outletId: '',
  isActive: true,
}

function mapToForm(data) {
  return {
    integrationName: data.integrationName || '',
    integrationType: data.integrationType || 'Accounting',
    provider: data.provider || 'Jurnal',
    apiKey: data.apiKey || '',
    apiSecret: data.apiSecret || '',
    webhookUrl: data.webhookUrl || '',
    baseUrl: data.baseUrl || '',
    syncDirection: data.syncDirection || 'Bidirectional',
    notes: data.notes || '',
    outletId: data.outletId ? String(data.outletId) : '',
    isActive: data.isActive !== false,
  }
}

export default function IntegrasiSetting() {
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [outlets, setOutlets] = useState([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [outletFilter, setOutletFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const providerOptions = useMemo(
    () => PROVIDERS_BY_TYPE[form.integrationType] || [],
    [form.integrationType],
  )

  const filterProviderOptions = useMemo(() => {
    if (!typeFilter) {
      return Object.values(PROVIDERS_BY_TYPE).flat()
    }
    return PROVIDERS_BY_TYPE[typeFilter] || []
  }, [typeFilter])

  const loadList = useCallback(async () => {
    const params = { search: search || undefined }
    if (activeFilter === 'active') params.isActive = true
    if (activeFilter === 'inactive') params.isActive = false
    if (typeFilter) params.integrationType = typeFilter
    if (providerFilter) params.provider = providerFilter
    if (outletFilter) params.outletId = Number(outletFilter)
    const data = await integrationsApi.list(params)
    setListData(data)
  }, [search, activeFilter, typeFilter, providerFilter, outletFilter])

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
      const integration = await integrationsApi.getById(id)
      setEditingId(id)
      setForm(mapToForm(integration))
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleTypeChange = (integrationType) => {
    const providers = PROVIDERS_BY_TYPE[integrationType] || []
    setForm({
      ...form,
      integrationType,
      provider: providers[0]?.value || '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.integrationName.trim()) {
      setError('Nama integrasi wajib diisi.')
      return
    }
    if (!form.provider) {
      setError('Provider wajib dipilih.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        integrationName: form.integrationName.trim(),
        integrationType: form.integrationType,
        provider: form.provider,
        apiKey: form.apiKey.trim() || null,
        apiSecret: form.apiSecret.trim() || null,
        webhookUrl: form.webhookUrl.trim() || null,
        baseUrl: form.baseUrl.trim() || null,
        syncDirection: form.syncDirection,
        notes: form.notes.trim() || null,
        outletId: form.outletId ? Number(form.outletId) : null,
        isActive: form.isActive,
      }
      const result = editingId
        ? await integrationsApi.update(editingId, payload)
        : await integrationsApi.create(payload)
      setSuccess(
        editingId
          ? `Integrasi "${result.integrationName}" berhasil diperbarui.`
          : `Integrasi baru: ${result.integrationName}`,
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
    if (!window.confirm(`Hapus integrasi "${name}"?`)) return

    setDeletingId(id)
    setError('')
    try {
      await integrationsApi.remove(id)
      setSuccess(`Integrasi "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Integrasi Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => { setView('list'); setEditingId(null); setError('') }}
    >
      ← Daftar Integrasi
    </Button>
  )

  return (
    <PageShell
      title="Integrasi"
      description="ExternalIntegrations — koneksi akuntansi, marketplace, pesan, e-commerce, dan webhook"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat konfigurasi integrasi..."
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
                  placeholder="Nama integrasi, provider, catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Tipe">
                <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setProviderFilter('') }}>
                  <option value="">Semua</option>
                  {INTEGRATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Provider">
                <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
                  <option value="">Semua</option>
                  {filterProviderOptions.map((p) => (
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
              <StatCard label="Total Integrasi" value={listData.totalCount} />
              <StatCard label="Aktif" value={listData.activeCount} />
              <StatCard label="Sinkron Berhasil" value={listData.syncedCount} />
            </div>
          )}

          <Panel>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Integrasi</th>
                    <th>Tipe</th>
                    <th>Provider</th>
                    <th>Arah Sync</th>
                    <th>API Key</th>
                    <th>Terakhir Sync</th>
                    <th>Status Sync</th>
                    <th>Outlet</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!listData?.integrations?.length ? (
                    <tr>
                      <td colSpan={11} className="ui-table-empty">Belum ada integrasi terdaftar</td>
                    </tr>
                  ) : (
                    listData.integrations.map((item) => (
                      <tr key={item.id} className={!item.isActive ? 'pos-row-inactive' : undefined}>
                        <td>{item.id}</td>
                        <td className="pos-ref-link">{item.integrationName}</td>
                        <td>{TYPE_LABELS[item.integrationType] || item.integrationType}</td>
                        <td>{item.provider}</td>
                        <td>{item.syncDirection}</td>
                        <td>{item.apiKeyMasked || '—'}</td>
                        <td>{item.lastSyncAt ? formatDateTime(item.lastSyncAt) : '—'}</td>
                        <td>
                          {item.lastSyncStatus ? (
                            <span className={`ui-badge ${SYNC_STATUS_BADGE[item.lastSyncStatus] || 'ui-badge-transfer'}`}>
                              {SYNC_STATUS_LABELS[item.lastSyncStatus] || item.lastSyncStatus}
                            </span>
                          ) : '—'}
                        </td>
                        <td>{item.outletName || 'Semua outlet'}</td>
                        <td>
                          <span className={`ui-badge ${item.isActive ? 'ui-badge-cash' : 'ui-badge-transfer'}`}>
                            {item.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="pos-table-actions">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(item.id)}>
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item.id, item.integrationName)}
                          >
                            {deletingId === item.id ? '...' : 'Hapus'}
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
          <Panel title={editingId ? 'Edit Integrasi' : 'Tambah Integrasi Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Integrasi *">
                <input
                  type="text"
                  placeholder="Contoh: Jurnal.id Akuntansi"
                  value={form.integrationName}
                  onChange={(e) => setForm({ ...form, integrationName: e.target.value })}
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField label="Tipe Integrasi *">
                <select
                  value={form.integrationType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  {INTEGRATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Provider *">
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                >
                  {providerOptions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="API Key / Client ID">
                <input
                  type="text"
                  placeholder="Kunci API dari provider"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  maxLength={255}
                />
              </FormField>
              <FormField label="API Secret / Token">
                <input
                  type="password"
                  placeholder={editingId ? 'Kosongkan jika tidak diubah' : 'Secret key atau token'}
                  value={form.apiSecret}
                  onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                  maxLength={255}
                  autoComplete="new-password"
                />
              </FormField>
              <FormField label="Arah Sinkronisasi *">
                <select
                  value={form.syncDirection}
                  onChange={(e) => setForm({ ...form, syncDirection: e.target.value })}
                >
                  {SYNC_DIRECTIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Base URL" className="ui-form-grid-span-2">
                <input
                  type="url"
                  placeholder="https://api.provider.com"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  maxLength={500}
                />
              </FormField>
              <FormField label="Webhook URL" className="ui-form-grid-span-2">
                <input
                  type="url"
                  placeholder="https://domain.com/api/integrations/webhook"
                  value={form.webhookUrl}
                  onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
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
              <FormField label="Catatan" className="ui-form-grid-span-3">
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat tujuan integrasi..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  maxLength={500}
                />
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
              Kredensial API disimpan di database dan ditampilkan ter-mask di daftar.
              Pilih arah sinkronisasi sesuai alur data: Inbound untuk import pesanan,
              Outbound untuk kirim notifikasi, Bidirectional untuk sinkronisasi dua arah.
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
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Integrasi'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
