import { useCallback, useEffect, useMemo, useState } from 'react'
import { purchasesApi } from '../../api/purchases'
import ProductSearchGrid from '../../components/pos/ProductSearchGrid'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  DataTable,
  TableActions,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '../../components/ui/Table'
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

function cartItemFromProduct(product) {
  return {
    productId: product.id,
    productCode: product.productCode,
    productName: product.productName,
    unit: product.unit,
    price: product.purchasePrice ?? 0,
    qty: 1,
  }
}

function cartItemFromDetail(line) {
  return {
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    unit: line.unit,
    price: line.price,
    qty: line.qty,
  }
}

const emptyHeader = {
  invoiceNumber: '',
  supplierId: '',
  purchaseDate: nowDatetimeLocal(),
}

export default function PurchaseOrder() {
  const [view, setView] = useState('list')
  const [formMeta, setFormMeta] = useState(null)
  const [listData, setListData] = useState(null)
  const [detail, setDetail] = useState(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [header, setHeader] = useState(emptyHeader)
  const [lines, setLines] = useState([])

  const loadList = useCallback(async () => {
    const data = await purchasesApi.list({
      search: search || undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
      supplierId: supplierFilter || undefined,
    })
    setListData(data)
  }, [search, dateFrom, dateTo, supplierFilter])

  const loadFormMeta = useCallback(async () => {
    const data = await purchasesApi.formData()
    setFormMeta(data)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([loadList(), loadFormMeta()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList, loadFormMeta])

  const grandTotal = useMemo(
    () => lines.reduce((sum, item) => sum + item.qty * item.price, 0),
    [lines],
  )

  const updateHeader = (field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }))
  }

  const addProduct = (product) => {
    setLines((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, cartItemFromProduct(product)]
    })
  }

  const updateLine = (productId, field, value) => {
    setLines((prev) => prev.map((item) => {
      if (item.productId !== productId) return item
      if (field === 'qty') {
        const qty = Math.max(1, Number(value) || 1)
        return { ...item, qty }
      }
      if (field === 'price') {
        return { ...item, price: Math.max(0, Number(value) || 0) }
      }
      return item
    }))
  }

  const removeLine = (productId) => {
    setLines((prev) => prev.filter((i) => i.productId !== productId))
  }

  const resetForm = () => {
    setEditingId(null)
    setHeader({ ...emptyHeader, purchaseDate: nowDatetimeLocal() })
    setLines([])
    setDetail(null)
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
      const record = await purchasesApi.get(id)
      setEditingId(id)
      setHeader({
        invoiceNumber: record.invoiceNumber || '',
        supplierId: record.supplierId ? String(record.supplierId) : '',
        purchaseDate: toDatetimeLocalValue(record.purchaseDate),
      })
      setLines(record.details.map(cartItemFromDetail))
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const openDetail = async (id) => {
    setError('')
    try {
      const record = await purchasesApi.get(id)
      setDetail(record)
      setView('detail')
    } catch (err) {
      setError(err.message)
    }
  }

  const buildPayload = () => ({
    invoiceNumber: header.invoiceNumber.trim() || null,
    supplierId: header.supplierId ? Number(header.supplierId) : null,
    purchaseDate: fromDatetimeLocalValue(header.purchaseDate),
    items: lines.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      price: item.price,
    })),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!header.purchaseDate) {
      setError('Tanggal pembelian wajib diisi.')
      return
    }
    if (lines.length === 0) {
      setError('Minimal satu produk wajib ditambahkan.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const payload = buildPayload()
      const result = editingId
        ? await purchasesApi.update(editingId, payload)
        : await purchasesApi.create(payload)
      setSuccess(
        editingId
          ? `PO ${result.invoiceNumber} berhasil diperbarui.`
          : `PO ${result.invoiceNumber} berhasil disimpan. Stok produk telah ditambahkan.`,
      )
      await loadList()
      setView('list')
      resetForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, invoice) => {
    if (!window.confirm(`Hapus purchase order "${invoice || id}"? Stok akan dikurangi.`)) return
    setDeletingId(id)
    setError('')
    try {
      await purchasesApi.delete(id)
      setSuccess(`PO "${invoice || id}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + PO Baru
    </Button>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => {
        setView('list')
        resetForm()
        setError('')
      }}
    >
      ← Daftar PO
    </Button>
  )

  return (
    <PageShell
      title="Purchase Order"
      description="Pembelian barang dari supplier (Purchases & PurchaseDetails) — stok otomatis masuk"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat purchase order..."
      error={!listData && error ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi (init.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Jumlah PO" value={listData.totalCount} />
            <StatCard label="Total Nilai Pembelian" value={formatRupiah(listData.totalAmount)} />
          </div>

          <Panel title="Daftar Purchase Order">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="No. invoice atau supplier"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Supplier">
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                >
                  <option value="">Semua supplier</option>
                  {formMeta?.suppliers?.map((s) => (
                    <option key={s.id} value={s.id}>{s.supplierName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Dari tanggal">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </FormField>
              <FormField label="Sampai tanggal">
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </FormField>
              <div className="ui-actions-row" style={{ alignSelf: 'end' }}>
                <Button variant="primary" type="button" onClick={() => loadList().catch((err) => setError(err.message))}>
                  Terapkan Filter
                </Button>
              </div>
            </div>

            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>No. Invoice</TableTh>
                  <TableTh>Supplier</TableTh>
                  <TableTh>Tanggal</TableTh>
                  <TableTh align="right">Item</TableTh>
                  <TableTh align="right">Total</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!listData.purchases?.length ? (
                  <TableEmpty colSpan={6}>Belum ada purchase order</TableEmpty>
                ) : (
                  listData.purchases.map((row) => (
                    <TableRow key={row.id}>
                      <TableTd emphasize>{row.invoiceNumber || `PO-${row.id}`}</TableTd>
                      <TableTd>{row.supplierName || '—'}</TableTd>
                      <TableTd>{formatDateTime(row.purchaseDate)}</TableTd>
                      <TableTd align="right">{row.lineCount}</TableTd>
                      <TableTd align="right" emphasize>{formatRupiah(row.totalAmount ?? 0)}</TableTd>
                      <TableActions>
                        <Button variant="secondary" size="sm" type="button" onClick={() => openDetail(row.id)}>
                          Detail
                        </Button>
                        <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(row.id)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => handleDelete(row.id, row.invoiceNumber)}
                        >
                          {deletingId === row.id ? '...' : 'Hapus'}
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

      {view === 'detail' && detail && (
        <Panel title={`Detail PO — ${detail.invoiceNumber || detail.id}`}>
          <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
            <FormField label="Supplier">
              <input type="text" readOnly value={detail.supplierName || '—'} />
            </FormField>
            <FormField label="Tanggal Pembelian">
              <input type="text" readOnly value={formatDateTime(detail.purchaseDate)} />
            </FormField>
            <FormField label="Total">
              <input type="text" readOnly value={formatRupiah(detail.totalAmount ?? 0)} />
            </FormField>
          </div>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableTh>Produk</TableTh>
                <TableTh align="right">Harga Beli</TableTh>
                <TableTh align="right">Qty</TableTh>
                <TableTh align="right">Total</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.details.map((line) => (
                <TableRow key={line.id}>
                  <TableTd>
                    <div className="pos-cart-product">{line.productName}</div>
                    <div className="pos-cart-code">{line.productCode}</div>
                  </TableTd>
                  <TableTd align="right">{formatRupiah(line.price)}</TableTd>
                  <TableTd align="right">{line.qty} {line.unit || ''}</TableTd>
                  <TableTd align="right" emphasize>{formatRupiah(line.total)}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
          <div className="ui-actions-row" style={{ marginTop: '1rem' }}>
            <Button variant="secondary" type="button" onClick={() => openEdit(detail.id)}>
              Edit PO
            </Button>
          </div>
        </Panel>
      )}

      {view === 'form' && (
        <form onSubmit={handleSubmit}>
          <Panel title={editingId ? 'Edit Purchase Order' : 'Purchase Order Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="No. Invoice">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Kosongkan untuk auto (PO-YYYYMMDD-001)"
                  value={header.invoiceNumber}
                  onChange={(e) => updateHeader('invoiceNumber', e.target.value)}
                />
              </FormField>
              <FormField label="Supplier">
                <select
                  value={header.supplierId}
                  onChange={(e) => updateHeader('supplierId', e.target.value)}
                >
                  <option value="">— Pilih supplier —</option>
                  {formMeta?.suppliers?.map((s) => (
                    <option key={s.id} value={s.id}>{s.supplierName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tanggal Pembelian *">
                <input
                  type="datetime-local"
                  value={header.purchaseDate}
                  onChange={(e) => updateHeader('purchaseDate', e.target.value)}
                  required
                />
              </FormField>
            </div>
            <p className="pos-form-hint">
              Setelah disimpan, stok produk bertambah dan tercatat di StockMovements (tipe IN).
            </p>
          </Panel>

          <div className="pos-checkout-layout" style={{ marginTop: '1rem' }}>
            <ProductSearchGrid
              products={formMeta?.products ?? []}
              onSelect={addProduct}
              respectStock={false}
              priceField="purchasePrice"
              priceLabel="Harga beli"
              searchPlaceholder="Cari produk untuk PO..."
            />

            <Panel title="Item Pembelian" className="pos-cart-panel">
              <DataTable className="pos-cart-table">
                <TableHead>
                  <TableRow>
                    <TableTh>Produk</TableTh>
                    <TableTh align="right">Harga Beli</TableTh>
                    <TableTh align="right">Qty</TableTh>
                    <TableTh align="right">Total</TableTh>
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
                        <TableTd align="right">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={item.price}
                            onChange={(e) => updateLine(item.productId, 'price', e.target.value)}
                            className="pos-input-sm"
                          />
                        </TableTd>
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
                          {formatRupiah(item.qty * item.price)}
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
                <div className="pos-summary-row pos-summary-total">
                  <span>Total Pembelian</span>
                  <strong>{formatRupiah(grandTotal)}</strong>
                </div>
              </div>

              <div className="ui-actions-row">
                <Button variant="secondary" type="button" onClick={() => { setView('list'); resetForm() }}>
                  Batal
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Purchase Order'}
                </Button>
              </div>
            </Panel>
          </div>
        </form>
      )}
    </PageShell>
  )
}
