import { useCallback, useEffect, useMemo, useState } from 'react'
import { productBundlesApi } from '../../api/productBundles'
import ProductSearchGrid from '../../components/pos/ProductSearchGrid'
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

const emptyForm = {
  bundleCode: '',
  bundleName: '',
  description: '',
  bundlePrice: '',
  startDate: todayStr(),
  endDate: '',
  outletId: '',
  isActive: true,
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

function lineFromProduct(product) {
  return {
    productId: product.id,
    productCode: product.productCode,
    productName: product.productName,
    unit: product.unit,
    sellingPrice: product.sellingPrice ?? 0,
    qty: 1,
  }
}

function lineFromItem(item) {
  return {
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    unit: item.unit,
    sellingPrice: item.sellingPrice,
    qty: item.qty,
  }
}

export default function Bundling() {
  const [view, setView] = useState('list')
  const [formMeta, setFormMeta] = useState(null)
  const [listData, setListData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editingCreatedAt, setEditingCreatedAt] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [lines, setLines] = useState([])
  const [deletingId, setDeletingId] = useState(null)

  const loadFormMeta = useCallback(async () => {
    const data = await productBundlesApi.formData()
    setFormMeta(data)
  }, [])

  const loadList = useCallback(async () => {
    const data = await productBundlesApi.list({
      search: search || undefined,
      isActive: activeFilter === '' ? undefined : activeFilter === 'true',
    })
    setListData(data)
  }, [search, activeFilter])

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([loadList(), loadFormMeta()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList, loadFormMeta])

  const normalTotal = useMemo(
    () => lines.reduce((sum, item) => sum + item.qty * item.sellingPrice, 0),
    [lines],
  )

  const bundlePriceNum = Number(form.bundlePrice) || 0
  const savings = Math.max(0, normalTotal - bundlePriceNum)

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addProduct = (product) => {
    setLines((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, lineFromProduct(product)]
    })
  }

  const updateLine = (productId, field, value) => {
    setLines((prev) => prev.map((item) => {
      if (item.productId !== productId) return item
      if (field === 'qty') {
        const qty = Math.max(1, Number(value) || 1)
        return { ...item, qty }
      }
      return item
    }))
  }

  const removeLine = (productId) => {
    setLines((prev) => prev.filter((i) => i.productId !== productId))
  }

  const openCreate = () => {
    setEditingId(null)
    setEditingCreatedAt(null)
    setForm({ ...emptyForm, startDate: todayStr() })
    setLines([])
    setView('form')
    setError('')
    setSuccess('')
  }

  const openEdit = async (id) => {
    setError('')
    try {
      const record = await productBundlesApi.get(id)
      setEditingId(id)
      setEditingCreatedAt(record.createdAt || null)
      setForm({
        bundleCode: record.bundleCode || '',
        bundleName: record.bundleName || '',
        description: record.description || '',
        bundlePrice: String(record.bundlePrice ?? ''),
        startDate: toInputDate(record.startDate),
        endDate: toInputDate(record.endDate),
        outletId: record.outletId ? String(record.outletId) : '',
        isActive: Boolean(record.isActive),
      })
      setLines((record.items || []).map(lineFromItem))
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const buildPayload = () => ({
    bundleCode: form.bundleCode.trim().toUpperCase(),
    bundleName: form.bundleName.trim(),
    description: form.description.trim() || null,
    bundlePrice: Number(form.bundlePrice),
    startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
    endDate: form.endDate ? new Date(`${form.endDate}T23:59:59`).toISOString() : null,
    outletId: form.outletId ? Number(form.outletId) : null,
    isActive: form.isActive,
    items: lines.map((line) => ({
      productId: line.productId,
      qty: line.qty,
    })),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.bundleCode.trim()) {
      setError('Kode bundling wajib diisi.')
      return
    }
    if (!form.bundleName.trim()) {
      setError('Nama bundling wajib diisi.')
      return
    }
    const bundlePrice = Number(form.bundlePrice)
    if (Number.isNaN(bundlePrice) || bundlePrice <= 0) {
      setError('Harga paket harus lebih dari 0.')
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
    if (!lines.length) {
      setError('Minimal satu produk harus ditambahkan.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = buildPayload()
      const result = editingId
        ? await productBundlesApi.update(editingId, payload)
        : await productBundlesApi.create(payload)
      setSuccess(
        editingId
          ? `Bundling "${result.bundleName}" berhasil diperbarui.`
          : `Bundling "${result.bundleName}" berhasil ditambahkan.`,
      )
      await loadList()
      setView('list')
      setEditingId(null)
      setForm(emptyForm)
      setLines([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus bundling "${name}"?`)) return
    setDeletingId(id)
    setError('')
    try {
      await productBundlesApi.delete(id)
      setSuccess(`Bundling "${name}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Tambah Bundling
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
      title="Bundling"
      description="Kelola paket bundling produk (ProductBundles & ProductBundleItems)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data bundling..."
      error={!listData && error ? error : undefined}
      errorHint="Pastikan tabel ProductBundles sudah dibuat (product-bundle-tables.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Total Bundling" value={listData.totalCount} />
            <StatCard label="Aktif" value={listData.activeCount} />
          </div>

          <Panel title="Daftar Bundling">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="Kode, nama, atau keterangan"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
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
                  <TableTh>Kode / Nama</TableTh>
                  <TableTh align="right">Harga Normal</TableTh>
                  <TableTh align="right">Harga Paket</TableTh>
                  <TableTh align="right">Hemat</TableTh>
                  <TableTh>Periode</TableTh>
                  <TableTh>Outlet</TableTh>
                  <TableTh align="right">Item</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!listData.bundles?.length ? (
                  <TableEmpty colSpan={9}>Belum ada bundling</TableEmpty>
                ) : (
                  listData.bundles.map((row) => (
                    <TableRow key={row.id}>
                      <TableTd>
                        <TableLink>{row.bundleName}</TableLink>
                        <TableSubtext>{row.bundleCode}</TableSubtext>
                        {row.description && <TableSubtext>{row.description}</TableSubtext>}
                      </TableTd>
                      <TableTd align="right">{formatRupiah(row.normalPrice)}</TableTd>
                      <TableTd align="right" amount>{formatRupiah(row.bundlePrice)}</TableTd>
                      <TableTd align="right">
                        {row.savings > 0 ? (
                          <span style={{ color: '#16a34a' }}>{formatRupiah(row.savings)}</span>
                        ) : '—'}
                      </TableTd>
                      <TableTd>
                        {formatDate(row.startDate)}
                        {' — '}
                        {row.endDate ? formatDate(row.endDate) : 'Tanpa batas'}
                      </TableTd>
                      <TableTd>{row.outletName || 'Semua outlet'}</TableTd>
                      <TableTd align="right">{row.itemCount}</TableTd>
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
                          onClick={() => handleDelete(row.id, row.bundleName)}
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
          <Panel title={editingId ? 'Edit Bundling' : 'Tambah Bundling Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Kode Bundling *">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Contoh: BND001"
                  value={form.bundleCode}
                  onChange={(e) => updateField('bundleCode', e.target.value.toUpperCase())}
                  required
                  autoComplete="off"
                />
              </FormField>
              <FormField label="Nama Bundling *">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Contoh: Paket Minuman Hemat"
                  value={form.bundleName}
                  onChange={(e) => updateField('bundleName', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Harga Paket (Rp) *">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="12000"
                  value={form.bundlePrice}
                  onChange={(e) => updateField('bundlePrice', e.target.value)}
                  required
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
                  placeholder="Deskripsi paket (opsional)"
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

            <p className="pos-form-hint">
              Harga paket biasanya lebih rendah dari total harga normal produk di dalamnya.
            </p>
          </Panel>

          <div className="pos-checkout-layout" style={{ marginTop: '1rem' }}>
            <ProductSearchGrid
              products={formMeta?.products ?? []}
              onSelect={addProduct}
              respectStock={false}
              priceField="sellingPrice"
              priceLabel="Harga jual"
              searchPlaceholder="Cari produk untuk ditambahkan ke paket..."
            />

            <Panel title={`Produk dalam Paket * (${lines.length} item)`} className="pos-cart-panel">
              <DataTable className="pos-cart-table">
                <TableHead>
                  <TableRow>
                    <TableTh>Produk</TableTh>
                    <TableTh align="right">Harga Jual</TableTh>
                    <TableTh align="right">Qty</TableTh>
                    <TableTh align="right">Subtotal</TableTh>
                    <TableTh align="actions" aria-label="Aksi" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableEmpty colSpan={5}>Klik produk di kiri untuk menambahkan item</TableEmpty>
                  ) : (
                    lines.map((item) => (
                      <TableRow key={item.productId}>
                        <TableTd>
                          <div className="pos-cart-product">{item.productName}</div>
                          {item.productCode && (
                            <div className="pos-cart-code">{item.productCode}</div>
                          )}
                        </TableTd>
                        <TableTd align="right">{formatRupiah(item.sellingPrice)}</TableTd>
                        <TableTd align="right">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateLine(item.productId, 'qty', e.target.value)}
                            className="pos-input-sm"
                          />
                        </TableTd>
                        <TableTd align="right" className="pos-line-total">
                          {formatRupiah(item.qty * item.sellingPrice)}
                        </TableTd>
                        <TableTd align="actions">
                          <button
                            type="button"
                            className="pos-btn-remove"
                            onClick={() => removeLine(item.productId)}
                            aria-label="Hapus item"
                          >
                            ×
                          </button>
                        </TableTd>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </DataTable>

              <div className="pos-order-summary" style={{ marginTop: '1rem' }}>
                <div className="pos-summary-row">
                  <span>Total Harga Normal</span>
                  <strong>{formatRupiah(normalTotal)}</strong>
                </div>
                <div className="pos-summary-row">
                  <span>Harga Paket</span>
                  <strong>{formatRupiah(bundlePriceNum)}</strong>
                </div>
                {savings > 0 && (
                  <div className="pos-summary-row" style={{ color: '#16a34a' }}>
                    <span>Hemat untuk Pelanggan</span>
                    <strong>{formatRupiah(savings)}</strong>
                  </div>
                )}
              </div>

              <div className="ui-actions-row">
                <Button variant="secondary" type="button" onClick={() => setView('list')}>
                  Batal
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Bundling'}
                </Button>
              </div>
            </Panel>
          </div>
        </form>
      )}
    </PageShell>
  )
}
