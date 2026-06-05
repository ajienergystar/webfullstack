import { useCallback, useEffect, useMemo, useState } from 'react'
import { productDiscountsApi } from '../../api/productDiscounts'
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
  badgeVariantActive,
} from '../../components/ui/Table'
import { todayStr } from '../../utils/date'
import { formatDateTime, formatRupiah } from '../../utils/format'

const DISCOUNT_TYPES = [
  { value: 'PERCENT', label: 'Persentase (%)' },
  { value: 'FIXED', label: 'Nominal Tetap (Rp)' },
]

const emptyForm = {
  discountName: '',
  discountType: 'PERCENT',
  discountValue: '',
  minPurchaseAmount: '',
  startDate: todayStr(),
  endDate: '',
  outletId: '',
  isActive: true,
  description: '',
  productIds: [],
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

function typeLabel(type) {
  return DISCOUNT_TYPES.find((t) => t.value === type)?.label || type
}

function formatDiscountValue(type, value) {
  if (type === 'PERCENT') return `${value}%`
  return formatRupiah(value)
}

export default function DiskonProduk() {
  const [view, setView] = useState('list')
  const [formMeta, setFormMeta] = useState(null)
  const [listData, setListData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editingCreatedAt, setEditingCreatedAt] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [productSearch, setProductSearch] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const loadFormMeta = useCallback(async () => {
    const data = await productDiscountsApi.formData()
    setFormMeta(data)
  }, [])

  const loadList = useCallback(async () => {
    const data = await productDiscountsApi.list({
      search: search || undefined,
      discountType: typeFilter || undefined,
      isActive: activeFilter === '' ? undefined : activeFilter === 'true',
    })
    setListData(data)
  }, [search, typeFilter, activeFilter])

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([loadList(), loadFormMeta()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList, loadFormMeta])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleProduct = (productId) => {
    setForm((prev) => {
      const ids = prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId]
      return { ...prev, productIds: ids }
    })
  }

  const filteredProducts = useMemo(() => {
    const products = formMeta?.products || []
    const q = productSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.productName?.toLowerCase().includes(q)
        || p.productCode?.toLowerCase().includes(q)
        || p.categoryName?.toLowerCase().includes(q),
    )
  }, [formMeta, productSearch])

  const openCreate = () => {
    setEditingId(null)
    setEditingCreatedAt(null)
    setForm({ ...emptyForm, startDate: todayStr() })
    setProductSearch('')
    setView('form')
    setError('')
    setSuccess('')
  }

  const openEdit = async (id) => {
    setError('')
    try {
      const record = await productDiscountsApi.get(id)
      setEditingId(id)
      setEditingCreatedAt(record.createdAt || null)
      setForm({
        discountName: record.discountName || '',
        discountType: record.discountType || 'PERCENT',
        discountValue: String(record.discountValue ?? ''),
        minPurchaseAmount: record.minPurchaseAmount != null ? String(record.minPurchaseAmount) : '',
        startDate: toInputDate(record.startDate),
        endDate: toInputDate(record.endDate),
        outletId: record.outletId ? String(record.outletId) : '',
        isActive: Boolean(record.isActive),
        description: record.description || '',
        productIds: (record.products || []).map((p) => p.productId),
      })
      setProductSearch('')
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const buildPayload = () => ({
    discountName: form.discountName.trim(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minPurchaseAmount: form.minPurchaseAmount !== '' ? Number(form.minPurchaseAmount) : null,
    startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
    endDate: form.endDate ? new Date(`${form.endDate}T23:59:59`).toISOString() : null,
    outletId: form.outletId ? Number(form.outletId) : null,
    isActive: form.isActive,
    description: form.description.trim() || null,
    productIds: form.productIds,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.discountName.trim()) {
      setError('Nama diskon wajib diisi.')
      return
    }
    const discountValue = Number(form.discountValue)
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      setError('Nilai diskon harus lebih dari 0.')
      return
    }
    if (form.discountType === 'PERCENT' && discountValue > 100) {
      setError('Diskon persentase maksimal 100%.')
      return
    }
    if (!form.startDate) {
      setError('Tanggal mulai wajib diisi.')
      return
    }
    if (form.endDate && form.endDate < form.startDate) {
      setError('Tanggal berakhir tidak boleh sebelum tanggal mulai.')
      return
    }
    if (!form.productIds.length) {
      setError('Minimal satu produk harus dipilih.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = buildPayload()
      const result = editingId
        ? await productDiscountsApi.update(editingId, payload)
        : await productDiscountsApi.create(payload)
      setSuccess(
        editingId
          ? `Diskon "${result.discountName}" berhasil diperbarui.`
          : `Diskon "${result.discountName}" berhasil ditambahkan.`,
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
    if (!window.confirm(`Hapus diskon "${name}"?`)) return
    setDeletingId(id)
    setError('')
    try {
      await productDiscountsApi.delete(id)
      setSuccess(`Diskon "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Tambah Diskon
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => {
        setView('list')
        setEditingId(null)
        setError('')
      }}
    >
      ← Kembali
    </Button>
  )

  return (
    <PageShell
      title="Diskon Produk"
      description="Kelola promo diskon per produk (ProductDiscounts & ProductDiscountItems)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data diskon produk..."
      error={!listData && error ? error : undefined}
      errorHint="Pastikan tabel ProductDiscounts sudah dibuat (product-discount-tables.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Total Diskon" value={listData.totalCount} />
            <StatCard label="Aktif" value={listData.activeCount} />
          </div>

          <Panel title="Daftar Diskon Produk">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="Nama diskon atau keterangan"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Tipe Diskon">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">Semua tipe</option>
                  {DISCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                  <option value="">Semua status</option>
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </FormField>
            </div>

            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>Nama Diskon</TableTh>
                  <TableTh>Tipe</TableTh>
                  <TableTh align="right">Nilai</TableTh>
                  <TableTh>Periode</TableTh>
                  <TableTh>Outlet</TableTh>
                  <TableTh align="right">Produk</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!listData.discounts?.length ? (
                  <TableEmpty colSpan={8}>Belum ada diskon produk</TableEmpty>
                ) : (
                  listData.discounts.map((row) => (
                    <TableRow key={row.id}>
                      <TableTd>
                        <TableLink>{row.discountName}</TableLink>
                        {row.description && <TableSubtext>{row.description}</TableSubtext>}
                        {row.minPurchaseAmount != null && row.minPurchaseAmount > 0 && (
                          <TableSubtext>
                            Min. belanja: {formatRupiah(row.minPurchaseAmount)}
                          </TableSubtext>
                        )}
                      </TableTd>
                      <TableTd>{typeLabel(row.discountType)}</TableTd>
                      <TableTd align="right">
                        {formatDiscountValue(row.discountType, row.discountValue)}
                      </TableTd>
                      <TableTd>
                        {formatDate(row.startDate)}
                        {' — '}
                        {row.endDate ? formatDate(row.endDate) : 'Tanpa batas'}
                      </TableTd>
                      <TableTd>{row.outletName || 'Semua outlet'}</TableTd>
                      <TableTd align="right">{row.productCount}</TableTd>
                      <TableTd>
                        <TableBadge variant={badgeVariantActive(row.isActive)}>
                          {row.isActive ? 'Aktif' : 'Nonaktif'}
                        </TableBadge>
                      </TableTd>
                      <TableActions>
                        <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(row.id)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => handleDelete(row.id, row.discountName)}
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
          <Panel title={editingId ? 'Edit Diskon Produk' : 'Tambah Diskon Produk Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nama Diskon *">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Contoh: Diskon Teh Botol 10%"
                  value={form.discountName}
                  onChange={(e) => updateField('discountName', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Tipe Diskon *">
                <select
                  value={form.discountType}
                  onChange={(e) => updateField('discountType', e.target.value)}
                  required
                >
                  {DISCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label={form.discountType === 'PERCENT' ? 'Nilai Diskon (%) *' : 'Nilai Diskon (Rp) *'}>
                <input
                  type="number"
                  min="0"
                  max={form.discountType === 'PERCENT' ? '100' : undefined}
                  step={form.discountType === 'PERCENT' ? '0.01' : '1'}
                  placeholder={form.discountType === 'PERCENT' ? '10' : '5000'}
                  value={form.discountValue}
                  onChange={(e) => updateField('discountValue', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Minimum Pembelian (Rp)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Opsional — kosongkan jika tidak ada"
                  value={form.minPurchaseAmount}
                  onChange={(e) => updateField('minPurchaseAmount', e.target.value)}
                />
              </FormField>
              <FormField label="Tanggal Mulai *">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Tanggal Berakhir">
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => updateField('endDate', e.target.value)}
                />
              </FormField>
              <FormField label="Outlet">
                <select
                  value={form.outletId}
                  onChange={(e) => updateField('outletId', e.target.value)}
                >
                  <option value="">Semua outlet</option>
                  {formMeta?.outlets?.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  value={form.isActive ? 'true' : 'false'}
                  onChange={(e) => updateField('isActive', e.target.value === 'true')}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </FormField>
              <FormField label="Keterangan" className="ui-form-grid-span-3">
                <textarea
                  rows={2}
                  maxLength={255}
                  placeholder="Catatan tambahan (opsional)"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </FormField>
            </div>

            {editingId && editingCreatedAt && (
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                Dibuat: {formatDateTime(editingCreatedAt)}
              </p>
            )}
          </Panel>

          <div style={{ marginTop: '1rem' }}>
          <Panel title={`Produk Terkait * (${form.productIds.length} dipilih)`}>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 240px' }}>
                <FormField label="Cari Produk">
                  <input
                    type="text"
                    placeholder="Nama, kode, atau kategori produk"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="ui-actions-row" style={{ marginTop: 0 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => updateField('productIds', (formMeta?.products || []).map((p) => p.id))}
                >
                  Pilih Semua
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => updateField('productIds', [])}
                >
                  Hapus Semua
                </Button>
              </div>
            </div>

            <div className="diskon-product-picker">
              {!filteredProducts.length ? (
                <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>
                  {productSearch ? 'Produk tidak ditemukan.' : 'Belum ada produk aktif.'}
                </p>
              ) : (
                filteredProducts.map((product) => {
                  const checked = form.productIds.includes(product.id)
                  return (
                    <label
                      key={product.id}
                      className={`diskon-product-item${checked ? ' is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProduct(product.id)}
                      />
                      <span className="diskon-product-info">
                        <strong>{product.productName}</strong>
                        <span className="diskon-product-meta">
                          {product.productCode}
                          {product.categoryName ? ` · ${product.categoryName}` : ''}
                          {' · '}
                          {formatRupiah(product.sellingPrice)}
                          {product.unit ? ` / ${product.unit}` : ''}
                        </span>
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </Panel>
          </div>

          <div className="ui-actions-row" style={{ marginTop: '1rem' }}>
            <Button variant="secondary" type="button" onClick={() => setView('list')}>
              Batal
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Diskon'}
            </Button>
          </div>
        </form>
      )}
    </PageShell>
  )
}
