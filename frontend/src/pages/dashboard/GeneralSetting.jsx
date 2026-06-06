import { useCallback, useEffect, useState } from 'react'
import { outletsApi } from '../../api/outlets'
import { settingsApi } from '../../api/settings'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import { formatDateTime } from '../../utils/format'

const CURRENCIES = [
  { code: 'IDR', symbol: 'Rp', label: 'Rupiah Indonesia (IDR)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (SGD)' },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit (MYR)' },
]

const TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB — Asia/Jakarta (UTC+7)' },
  { value: 'Asia/Makassar', label: 'WITA — Asia/Makassar (UTC+8)' },
  { value: 'Asia/Jayapura', label: 'WIT — Asia/Jayapura (UTC+9)' },
  { value: 'UTC', label: 'UTC' },
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
]

const emptyForm = {
  companyName: '',
  tagline: '',
  address: '',
  phoneNumber: '',
  email: '',
  website: '',
  taxId: '',
  currencyCode: 'IDR',
  currencySymbol: 'Rp',
  timezone: 'Asia/Jakarta',
  dateFormat: 'DD/MM/YYYY',
  defaultOutletId: '',
  invoicePrefix: 'INV',
  receiptHeader: '',
  receiptFooter: '',
  logoUrl: '',
  lowStockThreshold: '10',
  enableLoyalty: true,
  enableTax: true,
}

function mapToForm(data) {
  return {
    companyName: data.companyName || '',
    tagline: data.tagline || '',
    address: data.address || '',
    phoneNumber: data.phoneNumber || '',
    email: data.email || '',
    website: data.website || '',
    taxId: data.taxId || '',
    currencyCode: data.currencyCode || 'IDR',
    currencySymbol: data.currencySymbol || 'Rp',
    timezone: data.timezone || 'Asia/Jakarta',
    dateFormat: data.dateFormat || 'DD/MM/YYYY',
    defaultOutletId: data.defaultOutletId ? String(data.defaultOutletId) : '',
    invoicePrefix: data.invoicePrefix || 'INV',
    receiptHeader: data.receiptHeader || '',
    receiptFooter: data.receiptFooter || '',
    logoUrl: data.logoUrl || '',
    lowStockThreshold: String(data.lowStockThreshold ?? 10),
    enableLoyalty: Boolean(data.enableLoyalty),
    enableTax: Boolean(data.enableTax),
  }
}

export default function GeneralSetting() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [meta, setMeta] = useState(null)
  const [outlets, setOutlets] = useState([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [settings, outletList] = await Promise.all([
        settingsApi.getGeneral(),
        outletsApi.list({}),
      ])
      setForm(mapToForm(settings))
      setMeta(settings)
      setOutlets(outletList.outlets || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCurrencyChange = (code) => {
    const found = CURRENCIES.find((c) => c.code === code)
    setForm((prev) => ({
      ...prev,
      currencyCode: code,
      currencySymbol: found?.symbol || prev.currencySymbol,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.companyName.trim()) {
      setError('Nama perusahaan wajib diisi.')
      return
    }

    const lowStock = Number(form.lowStockThreshold)
    if (Number.isNaN(lowStock) || lowStock < 0 || lowStock > 9999) {
      setError('Batas stok menipis harus antara 0 dan 9999.')
      return
    }

    const payload = {
      companyName: form.companyName.trim(),
      tagline: form.tagline.trim() || null,
      address: form.address.trim() || null,
      phoneNumber: form.phoneNumber.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      taxId: form.taxId.trim() || null,
      currencyCode: form.currencyCode,
      currencySymbol: form.currencySymbol.trim(),
      timezone: form.timezone,
      dateFormat: form.dateFormat,
      defaultOutletId: form.defaultOutletId ? Number(form.defaultOutletId) : null,
      invoicePrefix: form.invoicePrefix.trim(),
      receiptHeader: form.receiptHeader.trim() || null,
      receiptFooter: form.receiptFooter.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      lowStockThreshold: lowStock,
      enableLoyalty: form.enableLoyalty,
      enableTax: form.enableTax,
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await settingsApi.updateGeneral(payload)
      setForm(mapToForm(result))
      setMeta(result)
      setSuccess('Pengaturan umum berhasil disimpan.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell
      title="General Setting"
      description="Konfigurasi umum aplikasi POS — tabel SystemSettings"
      loading={loading}
      loadingMessage="Memuat pengaturan umum..."
      error={!meta && error ? error : undefined}
      errorHint="Pastikan tabel SystemSettings sudah dibuat (system-settings-tables.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && meta && <div className="ui-alert ui-alert-error">{error}</div>}

      {meta && (
        <form onSubmit={handleSubmit}>
          <Panel title="Informasi Perusahaan">
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Perusahaan *">
                <input
                  type="text"
                  maxLength={150}
                  placeholder="Contoh: LatihanASP POS"
                  value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Tagline / Slogan">
                <input
                  type="text"
                  maxLength={255}
                  placeholder="Point of Sale untuk Retail & F&B"
                  value={form.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                />
              </FormField>
              <FormField label="NPWP / Tax ID">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="01.234.567.8-901.000"
                  value={form.taxId}
                  onChange={(e) => updateField('taxId', e.target.value)}
                />
              </FormField>
              <FormField label="Alamat" className="ui-form-grid-span-2">
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="Alamat lengkap perusahaan"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </FormField>
              <FormField label="Nomor Telepon">
                <input
                  type="tel"
                  maxLength={20}
                  placeholder="08123456789"
                  value={form.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                />
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  maxLength={100}
                  placeholder="info@perusahaan.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </FormField>
              <FormField label="Website">
                <input
                  type="url"
                  maxLength={150}
                  placeholder="https://perusahaan.com"
                  value={form.website}
                  onChange={(e) => updateField('website', e.target.value)}
                />
              </FormField>
              <FormField label="URL Logo">
                <input
                  type="url"
                  maxLength={500}
                  placeholder="https://cdn.example.com/logo.png"
                  value={form.logoUrl}
                  onChange={(e) => updateField('logoUrl', e.target.value)}
                />
              </FormField>
            </div>
          </Panel>

          <Panel title="Regional & Format">
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Mata Uang">
                <select
                  value={form.currencyCode}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Simbol Mata Uang">
                <input
                  type="text"
                  maxLength={10}
                  value={form.currencySymbol}
                  onChange={(e) => updateField('currencySymbol', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Zona Waktu">
                <select
                  value={form.timezone}
                  onChange={(e) => updateField('timezone', e.target.value)}
                >
                  {TIMEZONES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Format Tanggal">
                <select
                  value={form.dateFormat}
                  onChange={(e) => updateField('dateFormat', e.target.value)}
                >
                  {DATE_FORMATS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </Panel>

          <Panel title="Operasional POS">
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Outlet Default">
                <select
                  value={form.defaultOutletId}
                  onChange={(e) => updateField('defaultOutletId', e.target.value)}
                >
                  <option value="">— Pilih outlet —</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Prefix Invoice *">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="INV"
                  value={form.invoicePrefix}
                  onChange={(e) => updateField('invoicePrefix', e.target.value.toUpperCase())}
                  required
                />
              </FormField>
              <FormField label="Batas Stok Menipis">
                <input
                  type="number"
                  min="0"
                  max="9999"
                  value={form.lowStockThreshold}
                  onChange={(e) => updateField('lowStockThreshold', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Aktifkan Loyalty Point">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '2.5rem' }}>
                  <input
                    type="checkbox"
                    checked={form.enableLoyalty}
                    onChange={(e) => updateField('enableLoyalty', e.target.checked)}
                  />
                  <span>Hitung poin loyalitas pelanggan</span>
                </label>
              </FormField>
              <FormField label="Aktifkan Pajak">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '2.5rem' }}>
                  <input
                    type="checkbox"
                    checked={form.enableTax}
                    onChange={(e) => updateField('enableTax', e.target.checked)}
                  />
                  <span>Terapkan perhitungan pajak di kasir</span>
                </label>
              </FormField>
            </div>
          </Panel>

          <Panel title="Struk & Nota">
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Header Struk">
                <textarea
                  rows={2}
                  maxLength={255}
                  placeholder="Pesan di bagian atas struk"
                  value={form.receiptHeader}
                  onChange={(e) => updateField('receiptHeader', e.target.value)}
                />
              </FormField>
              <FormField label="Footer Struk">
                <textarea
                  rows={2}
                  maxLength={255}
                  placeholder="Pesan di bagian bawah struk"
                  value={form.receiptFooter}
                  onChange={(e) => updateField('receiptFooter', e.target.value)}
                />
              </FormField>
            </div>
          </Panel>

          {meta.updatedAt && (
            <p className="pos-form-hint" style={{ marginBottom: '1rem' }}>
              Terakhir diperbarui: {formatDateTime(meta.updatedAt)}
              {meta.updatedByUserName ? ` · oleh ${meta.updatedByUserName}` : ''}
            </p>
          )}

          <div className="ui-actions-row">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setForm(mapToForm(meta))
                setError('')
              }}
            >
              Reset Perubahan
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          </div>
        </form>
      )}
    </PageShell>
  )
}
