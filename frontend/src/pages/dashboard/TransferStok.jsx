import { useCallback, useEffect, useMemo, useState } from 'react'
import { stockTransfersApi } from '../../api/stockTransfers'
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
import { formatDateTime } from '../../utils/format'

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

function lineFromProduct(product) {
  return {
    productId: product.id,
    productCode: product.productCode,
    productName: product.productName,
    unit: product.unit,
    stock: product.stock,
    qty: 1,
  }
}

function lineFromDetail(line) {
  return {
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    unit: line.unit,
    stock: null,
    qty: line.qty,
  }
}

const emptyHeader = {
  referenceNumber: '',
  fromOutletId: '',
  toOutletId: '',
  transferDate: nowDatetimeLocal(),
  notes: '',
}

export default function TransferStok() {
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
  const [fromOutletFilter, setFromOutletFilter] = useState('')
  const [toOutletFilter, setToOutletFilter] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [header, setHeader] = useState(emptyHeader)
  const [lines, setLines] = useState([])

  const loadList = useCallback(async () => {
    const data = await stockTransfersApi.list({
      search: search || undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
      fromOutletId: fromOutletFilter || undefined,
      toOutletId: toOutletFilter || undefined,
    })
    setListData(data)
  }, [search, dateFrom, dateTo, fromOutletFilter, toOutletFilter])

  const loadFormMeta = useCallback(async () => {
    const data = await stockTransfersApi.formData()
    setFormMeta(data)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([loadList(), loadFormMeta()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList, loadFormMeta])

  const totalQty = useMemo(
    () => lines.reduce((sum, item) => sum + item.qty, 0),
    [lines],
  )

  const updateHeader = (field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }))
  }

  const addProduct = (product) => {
    if (product.stock <= 0) {
      setError(`Stok ${product.productName} habis.`)
      return
    }
    setLines((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id)
      if (idx >= 0) {
        const next = [...prev]
        const newQty = next[idx].qty + 1
        if (newQty > product.stock) {
          setError(`Stok maksimal ${product.stock} untuk ${product.productName}.`)
          return prev
        }
        next[idx] = { ...next[idx], qty: newQty, stock: product.stock }
        return next
      }
      return [...prev, lineFromProduct(product)]
    })
    setError('')
  }

  const updateLine = (productId, value) => {
    setLines((prev) => prev.map((item) => {
      if (item.productId !== productId) return item
      const qty = Math.max(1, Number(value) || 1)
      const maxStock = item.stock ?? formMeta?.products?.find((p) => p.id === productId)?.stock
      if (maxStock != null && qty > maxStock) {
        setError(`Stok maksimal ${maxStock} untuk ${item.productName}.`)
        return item
      }
      return { ...item, qty }
    }))
  }

  const removeLine = (productId) => {
    setLines((prev) => prev.filter((i) => i.productId !== productId))
  }

  const resetForm = () => {
    setEditingId(null)
    setHeader({ ...emptyHeader, transferDate: nowDatetimeLocal() })
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
      const record = await stockTransfersApi.get(id)
      setEditingId(id)
      setHeader({
        referenceNumber: record.referenceNumber || '',
        fromOutletId: String(record.fromOutletId),
        toOutletId: String(record.toOutletId),
        transferDate: toDatetimeLocalValue(record.transferDate),
        notes: record.notes || '',
      })
      setLines(record.details.map(lineFromDetail))
      setView('form')
    } catch (err) {
      setError(err.message)
    }
  }

  const openDetail = async (id) => {
    setError('')
    try {
      const record = await stockTransfersApi.get(id)
      setDetail(record)
      setView('detail')
    } catch (err) {
      setError(err.message)
    }
  }

  const buildPayload = () => ({
    referenceNumber: header.referenceNumber.trim() || null,
    fromOutletId: Number(header.fromOutletId),
    toOutletId: Number(header.toOutletId),
    transferDate: fromDatetimeLocalValue(header.transferDate),
    notes: header.notes.trim() || null,
    items: lines.map((item) => ({
      productId: item.productId,
      qty: item.qty,
    })),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!header.fromOutletId || !header.toOutletId) {
      setError('Outlet asal dan tujuan wajib dipilih.')
      return
    }
    if (header.fromOutletId === header.toOutletId) {
      setError('Outlet asal dan tujuan tidak boleh sama.')
      return
    }
    if (!header.transferDate) {
      setError('Tanggal transfer wajib diisi.')
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
        ? await stockTransfersApi.update(editingId, payload)
        : await stockTransfersApi.create(payload)
      setSuccess(
        editingId
          ? `Transfer ${result.referenceNumber} berhasil diperbarui.`
          : `Transfer ${result.referenceNumber} berhasil disimpan (${result.totalQty} unit).`,
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

  const handleDelete = async (id, reference) => {
    if (!window.confirm(`Hapus transfer stok "${reference || id}"?`)) return
    setDeletingId(id)
    setError('')
    try {
      await stockTransfersApi.delete(id)
      setSuccess(`Transfer "${reference || id}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Transfer Baru
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
      ← Daftar Transfer
    </Button>
  )

  return (
    <PageShell
      title="Transfer Stok"
      description="StockTransfers & StockTransferDetails — perpindahan stok antar cabang/outlet"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat transfer stok..."
      error={!listData && error ? error : undefined}
      errorHint="Pastikan tabel StockTransfers sudah dibuat (init.sql atau stock-transfer-tables.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Jumlah Transfer" value={listData.totalCount} />
            <StatCard label="Total Unit Dipindahkan" value={listData.totalQty} />
          </div>

          <Panel title="Daftar Transfer Stok">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="No. referensi, outlet, catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Outlet Asal">
                <select
                  value={fromOutletFilter}
                  onChange={(e) => setFromOutletFilter(e.target.value)}
                >
                  <option value="">Semua outlet asal</option>
                  {formMeta?.outlets?.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Outlet Tujuan">
                <select
                  value={toOutletFilter}
                  onChange={(e) => setToOutletFilter(e.target.value)}
                >
                  <option value="">Semua outlet tujuan</option>
                  {formMeta?.outlets?.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
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
                  <TableTh>No. Referensi</TableTh>
                  <TableTh>Outlet Asal</TableTh>
                  <TableTh>Outlet Tujuan</TableTh>
                  <TableTh>Tanggal</TableTh>
                  <TableTh align="right">Item</TableTh>
                  <TableTh align="right">Total Qty</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!listData.transfers?.length ? (
                  <TableEmpty colSpan={7}>Belum ada transfer stok</TableEmpty>
                ) : (
                  listData.transfers.map((row) => (
                    <TableRow key={row.id}>
                      <TableTd emphasize>{row.referenceNumber}</TableTd>
                      <TableTd>{row.fromOutletName}</TableTd>
                      <TableTd>{row.toOutletName}</TableTd>
                      <TableTd>{formatDateTime(row.transferDate)}</TableTd>
                      <TableTd align="right">{row.lineCount}</TableTd>
                      <TableTd align="right" emphasize>{row.totalQty}</TableTd>
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
                          onClick={() => handleDelete(row.id, row.referenceNumber)}
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
        <Panel title={`Detail Transfer — ${detail.referenceNumber}`}>
          <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
            <FormField label="Outlet Asal">
              <input type="text" readOnly value={detail.fromOutletName} />
            </FormField>
            <FormField label="Outlet Tujuan">
              <input type="text" readOnly value={detail.toOutletName} />
            </FormField>
            <FormField label="Tanggal Transfer">
              <input type="text" readOnly value={formatDateTime(detail.transferDate)} />
            </FormField>
            <FormField label="Status">
              <input type="text" readOnly value={detail.status} />
            </FormField>
            <FormField label="Catatan" className="ui-form-span-2">
              <input type="text" readOnly value={detail.notes || '—'} />
            </FormField>
          </div>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableTh>Produk</TableTh>
                <TableTh align="right">Qty</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.details.map((line) => (
                <TableRow key={line.id}>
                  <TableTd>
                    <div className="pos-cart-product">{line.productName}</div>
                    <div className="pos-cart-code">{line.productCode}</div>
                  </TableTd>
                  <TableTd align="right">{line.qty} {line.unit || ''}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
          <div className="ui-actions-row" style={{ marginTop: '1rem' }}>
            <Button variant="secondary" type="button" onClick={() => openEdit(detail.id)}>
              Edit Transfer
            </Button>
          </div>
        </Panel>
      )}

      {view === 'form' && (
        <form onSubmit={handleSubmit}>
          <Panel title={editingId ? 'Edit Transfer Stok' : 'Buat Transfer Stok Baru'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Nomor Referensi">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Kosongkan untuk auto (TRF-YYYYMMDD-0001)"
                  value={header.referenceNumber}
                  onChange={(e) => updateHeader('referenceNumber', e.target.value)}
                />
              </FormField>
              <FormField label="Outlet Asal *">
                <select
                  value={header.fromOutletId}
                  onChange={(e) => updateHeader('fromOutletId', e.target.value)}
                  required
                >
                  <option value="">— Pilih outlet asal —</option>
                  {formMeta?.outlets?.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Outlet Tujuan *">
                <select
                  value={header.toOutletId}
                  onChange={(e) => updateHeader('toOutletId', e.target.value)}
                  required
                >
                  <option value="">— Pilih outlet tujuan —</option>
                  {formMeta?.outlets?.map((o) => (
                    <option
                      key={o.id}
                      value={o.id}
                      disabled={String(o.id) === header.fromOutletId}
                    >
                      {o.outletName}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tanggal Transfer *">
                <input
                  type="datetime-local"
                  value={header.transferDate}
                  onChange={(e) => updateHeader('transferDate', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Catatan" className="ui-form-span-2">
                <textarea
                  rows={2}
                  maxLength={255}
                  placeholder="Keterangan tambahan (opsional)"
                  value={header.notes}
                  onChange={(e) => updateHeader('notes', e.target.value)}
                />
              </FormField>
            </div>
            <p className="pos-form-hint">
              Transfer tercatat di StockTransfers dan StockMovements (tipe TRANSFER).
              Stok global Products.Stock tidak berubah — validasi qty mengacu pada stok tersedia sistem.
            </p>
          </Panel>

          <div className="pos-checkout-layout" style={{ marginTop: '1rem' }}>
            <ProductSearchGrid
              products={formMeta?.products ?? []}
              onSelect={addProduct}
              respectStock
              searchPlaceholder="Cari produk untuk transfer..."
            />

            <Panel title="Item Transfer" className="pos-cart-panel">
              <DataTable className="pos-cart-table">
                <TableHead>
                  <TableRow>
                    <TableTh>Produk</TableTh>
                    <TableTh align="right">Stok Tersedia</TableTh>
                    <TableTh align="right">Jumlah</TableTh>
                    <TableTh align="actions" aria-label="Aksi" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableEmpty colSpan={4}>Klik produk di kiri untuk menambahkan item</TableEmpty>
                  ) : (
                    lines.map((item) => {
                      const available = item.stock
                        ?? formMeta?.products?.find((p) => p.id === item.productId)?.stock
                      return (
                        <TableRow key={item.productId}>
                          <TableTd>
                            <div className="pos-cart-product">{item.productName}</div>
                            {item.productCode && (
                              <div className="pos-cart-code">{item.productCode}</div>
                            )}
                          </TableTd>
                          <TableTd align="right">
                            <span className={available <= 5 ? 'pos-stock-low' : 'pos-stock-ok'}>
                              {available ?? '—'}
                            </span>
                            {item.unit && ` ${item.unit}`}
                          </TableTd>
                          <TableTd align="right">
                            <input
                              type="number"
                              min="1"
                              max={available ?? undefined}
                              value={item.qty}
                              onChange={(e) => updateLine(item.productId, e.target.value)}
                              className="pos-input-sm"
                            />
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
                      )
                    })
                  )}
                </TableBody>
              </DataTable>

              <div className="pos-order-summary" style={{ marginTop: '1rem' }}>
                <div className="pos-summary-row pos-summary-total">
                  <span>Total Unit Transfer</span>
                  <strong>{totalQty}</strong>
                </div>
              </div>

              <div className="ui-actions-row">
                <Button variant="secondary" type="button" onClick={() => { setView('list'); resetForm() }}>
                  Batal
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Transfer'}
                </Button>
              </div>
            </Panel>
          </div>
        </form>
      )}
    </PageShell>
  )
}
