import { useCallback, useEffect, useMemo, useState } from 'react'
import { purchasesApi } from '../../api/purchases'
import { stockApi } from '../../api/stock'
import ProductSearchGrid from '../../components/pos/ProductSearchGrid'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  DataTable,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '../../components/ui/Table'
import { formatDateTime, formatRupiah } from '../../utils/format'

function cartItemFromProduct(product) {
  return {
    productId: product.id,
    productCode: product.productCode,
    productName: product.productName,
    unit: product.unit,
    stock: product.stock ?? 0,
    orderedQty: null,
    qty: 1,
    price: product.purchasePrice ?? 0,
    reason: '',
  }
}

function cartItemFromPoLine(line) {
  return {
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    unit: line.unit,
    stock: null,
    orderedQty: line.qty,
    qty: line.qty,
    price: line.price,
    reason: '',
  }
}

const emptyHeader = {
  referenceNumber: '',
  purchaseId: '',
  supplierName: '',
  notes: '',
}

function groupPurchaseReturns(movements) {
  const map = new Map()
  for (const m of movements ?? []) {
    const ref = m.referenceNumber || ''
    if (!ref.startsWith('PRN')) continue
    if (!map.has(ref)) {
      map.set(ref, {
        referenceNumber: ref,
        createdAt: m.createdAt,
        lines: [],
        totalQty: 0,
        productCount: 0,
      })
    }
    const group = map.get(ref)
    group.lines.push(m)
    group.totalQty += m.qty
    group.productCount += 1
    if (new Date(m.createdAt) > new Date(group.createdAt)) {
      group.createdAt = m.createdAt
    }
  }
  return [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function parsePoFromReference(ref) {
  if (!ref) return null
  const match = ref.match(/\|PO:([^|]+)/i)
  return match ? match[1] : null
}

function parseNotesFromReference(ref) {
  if (!ref) return null
  const match = ref.match(/\|N:([^|]+)/i)
  return match ? match[1] : null
}

export default function ReturPembelian() {
  const [view, setView] = useState('list')
  const [formMeta, setFormMeta] = useState(null)
  const [purchaseList, setPurchaseList] = useState(null)
  const [movements, setMovements] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailPo, setDetailPo] = useState(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [header, setHeader] = useState(emptyHeader)
  const [lines, setLines] = useState([])

  const loadMovements = useCallback(async () => {
    const data = await stockApi.movements({
      movementType: 'OUT',
      search: search || 'PRN',
    })
    setMovements(data)
  }, [search])

  const loadFormMeta = useCallback(async () => {
    const data = await purchasesApi.formData()
    setFormMeta(data)
  }, [])

  const loadPurchases = useCallback(async () => {
    const data = await purchasesApi.list({})
    setPurchaseList(data)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([loadMovements(), loadFormMeta(), loadPurchases()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadMovements, loadFormMeta, loadPurchases])

  const returns = useMemo(
    () => groupPurchaseReturns(movements?.movements),
    [movements],
  )

  const grandTotal = useMemo(
    () => lines.reduce((sum, item) => sum + item.qty * item.price, 0),
    [lines],
  )

  const totalQtyReturn = useMemo(
    () => lines.reduce((sum, item) => sum + item.qty, 0),
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
        const maxQty = product.stock ?? next[idx].stock ?? 999999
        next[idx] = {
          ...next[idx],
          qty: Math.min(next[idx].qty + 1, maxQty),
        }
        return next
      }
      return [...prev, cartItemFromProduct(product)]
    })
  }

  const updateLine = (productId, field, value) => {
    setLines((prev) => prev.map((item) => {
      if (item.productId !== productId) return item
      if (field === 'qty') {
        const maxFromPo = item.orderedQty != null ? item.orderedQty : 999999
        const maxFromStock = item.stock != null ? item.stock : 999999
        const qty = Math.max(1, Math.min(Number(value) || 1, maxFromPo, maxFromStock))
        return { ...item, qty }
      }
      if (field === 'price') {
        return { ...item, price: Math.max(0, Number(value) || 0) }
      }
      if (field === 'reason') {
        return { ...item, reason: value }
      }
      return item
    }))
  }

  const removeLine = (productId) => {
    setLines((prev) => prev.filter((i) => i.productId !== productId))
  }

  const resetForm = () => {
    setHeader(emptyHeader)
    setLines([])
    setDetail(null)
    setDetailPo(null)
  }

  const openCreate = () => {
    resetForm()
    setView('form')
    setError('')
    setSuccess('')
  }

  const openDetail = async (referenceNumber) => {
    const group = returns.find((r) => r.referenceNumber === referenceNumber)
    if (!group) return

    setDetail(group)
    setDetailPo(null)
    setView('detail')

    const poInvoice = parsePoFromReference(referenceNumber)
    if (poInvoice && purchaseList?.purchases?.length) {
      const po = purchaseList.purchases.find(
        (p) => (p.invoiceNumber || `PO-${p.id}`) === poInvoice,
      )
      if (po) {
        try {
          const record = await purchasesApi.get(po.id)
          setDetailPo(record)
        } catch {
          /* detail PO opsional */
        }
      }
    }
  }

  const loadFromPurchaseOrder = async (purchaseId) => {
    if (!purchaseId) return
    setError('')
    try {
      const record = await purchasesApi.get(purchaseId)
      setHeader((prev) => ({
        ...prev,
        purchaseId: String(purchaseId),
        supplierName: record.supplierName || '',
      }))
      const stockByProduct = new Map(
        (formMeta?.products ?? []).map((p) => [p.id, p.stock]),
      )
      setLines(record.details.map((line) => ({
        ...cartItemFromPoLine(line),
        stock: stockByProduct.get(line.productId) ?? null,
      })))
    } catch (err) {
      setError(err.message)
    }
  }

  const handlePurchaseChange = (value) => {
    updateHeader('purchaseId', value)
    if (value) loadFromPurchaseOrder(value)
    else {
      updateHeader('supplierName', '')
      setLines([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (lines.length === 0) {
      setError('Minimal satu produk wajib ditambahkan untuk diretur.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await stockApi.purchaseReturn({
        referenceNumber: header.referenceNumber.trim() || null,
        purchaseId: header.purchaseId ? Number(header.purchaseId) : null,
        notes: header.notes.trim() || null,
        items: lines.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          reason: item.reason?.trim() || null,
        })),
      })
      setSuccess(
        `Retur ${result.referenceNumber.split('|')[0]} tersimpan — ${result.lineCount} produk, ${result.totalQty} unit, nilai ${formatRupiah(result.totalAmount)}. Stok berkurang.`,
      )
      await loadMovements()
      setView('list')
      resetForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const listActions = view === 'list' ? (
    <Button variant="primary" type="button" onClick={openCreate}>
      + Retur Baru
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
      ← Daftar Retur
    </Button>
  )

  const getLinePrice = (productId) => {
    const poLine = detailPo?.details?.find((d) => d.productId === productId)
    return poLine?.price ?? 0
  }

  return (
    <PageShell
      title="Retur Pembelian"
      description="Pengembalian barang ke supplier (StockMovements OUT) — mengacu ke Purchases & PurchaseDetails"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat retur pembelian..."
      error={!movements && error ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi (init.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && movements && <div className="ui-alert ui-alert-error">{error}</div>}

      {movements && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Dokumen Retur" value={returns.length} />
            <StatCard
              label="Total Unit Diretur"
              value={returns.reduce((s, r) => s + r.totalQty, 0)}
            />
          </div>

          <Panel title="Riwayat Retur Pembelian">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="No. PRN, produk, atau PO..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
              <div className="ui-actions-row" style={{ alignSelf: 'end' }}>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => loadMovements().catch((err) => setError(err.message))}
                >
                  Terapkan Filter
                </Button>
              </div>
            </div>

            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>No. Retur (PRN)</TableTh>
                  <TableTh>Referensi PO</TableTh>
                  <TableTh>Tanggal</TableTh>
                  <TableTh align="right">Produk</TableTh>
                  <TableTh align="right">Total Qty</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!returns.length ? (
                  <TableEmpty colSpan={6}>Belum ada retur pembelian (PRN)</TableEmpty>
                ) : (
                  returns.map((row) => (
                    <TableRow key={row.referenceNumber}>
                      <TableTd emphasize>{row.referenceNumber.split('|')[0]}</TableTd>
                      <TableTd>{parsePoFromReference(row.referenceNumber) || '—'}</TableTd>
                      <TableTd>{formatDateTime(row.createdAt)}</TableTd>
                      <TableTd align="right">{row.productCount}</TableTd>
                      <TableTd align="right" emphasize>{row.totalQty}</TableTd>
                      <TableTd align="actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => openDetail(row.referenceNumber)}
                        >
                          Detail
                        </Button>
                      </TableTd>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </DataTable>
          </Panel>
        </>
      )}

      {view === 'detail' && detail && (
        <Panel title={`Detail Retur — ${detail.referenceNumber.split('|')[0]}`}>
          <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
            <FormField label="Referensi PO">
              <input type="text" readOnly value={parsePoFromReference(detail.referenceNumber) || '—'} />
            </FormField>
            <FormField label="Supplier">
              <input type="text" readOnly value={detailPo?.supplierName || '—'} />
            </FormField>
            <FormField label="Tanggal Retur">
              <input type="text" readOnly value={formatDateTime(detail.createdAt)} />
            </FormField>
            <FormField label="Catatan">
              <input
                type="text"
                readOnly
                value={parseNotesFromReference(detail.referenceNumber) || '—'}
              />
            </FormField>
            <FormField label="Total Qty Diretur">
              <input type="text" readOnly value={String(detail.totalQty)} />
            </FormField>
            {detailPo && (
              <FormField label="Nilai Retur (estimasi dari PO)">
                <input
                  type="text"
                  readOnly
                  value={formatRupiah(
                    detail.lines.reduce(
                      (sum, line) => sum + line.qty * getLinePrice(line.productId),
                      0,
                    ),
                  )}
                />
              </FormField>
            )}
          </div>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableTh>Produk</TableTh>
                <TableTh align="right">Harga Beli</TableTh>
                <TableTh align="right">Qty Retur</TableTh>
                <TableTh align="right">Subtotal</TableTh>
                <TableTh>Tanggal Catat</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.lines.map((line) => {
                const price = getLinePrice(line.productId)
                return (
                  <TableRow key={line.id}>
                    <TableTd>
                      <div className="pos-cart-product">{line.productName}</div>
                      <div className="pos-cart-code">{line.productCode}</div>
                    </TableTd>
                    <TableTd align="right">
                      {price > 0 ? formatRupiah(price) : '—'}
                    </TableTd>
                    <TableTd align="right" emphasize>{line.qty}</TableTd>
                    <TableTd align="right" emphasize>
                      {price > 0 ? formatRupiah(line.qty * price) : '—'}
                    </TableTd>
                    <TableTd>{formatDateTime(line.createdAt)}</TableTd>
                  </TableRow>
                )
              })}
            </TableBody>
          </DataTable>
        </Panel>
      )}

      {view === 'form' && (
        <form onSubmit={handleSubmit}>
          <Panel title="Form Retur Pembelian">
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="No. Retur (PRN)">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Kosongkan untuk auto (PRN-YYYYMMDD-####)"
                  value={header.referenceNumber}
                  onChange={(e) => updateHeader('referenceNumber', e.target.value)}
                />
              </FormField>
              <FormField label="Referensi Purchase Order *">
                <select
                  value={header.purchaseId}
                  onChange={(e) => handlePurchaseChange(e.target.value)}
                  required
                >
                  <option value="">— Pilih PO —</option>
                  {purchaseList?.purchases?.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.invoiceNumber || `PO-${po.id}`}
                      {po.supplierName ? ` — ${po.supplierName}` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Supplier">
                <input type="text" readOnly value={header.supplierName || '—'} />
              </FormField>
              <FormField label="Catatan" className="ui-form-grid-span-3">
                <input
                  type="text"
                  maxLength={30}
                  placeholder="Opsional, disimpan di referensi jika muat (maks. 50 karakter total)"
                  value={header.notes}
                  onChange={(e) => updateHeader('notes', e.target.value)}
                />
              </FormField>
            </div>
            <p className="pos-form-hint">
              Data disimpan ke StockMovements (MovementType OUT) dan stok Products berkurang.
              Harga mengacu PurchaseDetails pada PO terpilih.
            </p>
          </Panel>

          <div className="pos-checkout-layout" style={{ marginTop: '1rem' }}>
            <ProductSearchGrid
              products={formMeta?.products ?? []}
              onSelect={addProduct}
              respectStock
              priceField="purchasePrice"
              priceLabel="Harga beli"
              searchPlaceholder="Cari produk untuk diretur..."
            />

            <Panel title="Item Retur" className="pos-cart-panel">
              <DataTable className="pos-cart-table">
                <TableHead>
                  <TableRow>
                    <TableTh>Produk</TableTh>
                    <TableTh align="right">Qty PO</TableTh>
                    <TableTh align="right">Stok</TableTh>
                    <TableTh align="right">Harga Beli</TableTh>
                    <TableTh align="right">Qty Retur *</TableTh>
                    <TableTh>Alasan</TableTh>
                    <TableTh align="right">Subtotal</TableTh>
                    <TableTh align="actions" aria-label="Aksi" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableEmpty colSpan={8}>
                      Pilih PO untuk mengisi item, atau klik produk di kiri
                    </TableEmpty>
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
                          {item.orderedQty != null ? `${item.orderedQty} ${item.unit || ''}` : '—'}
                        </TableTd>
                        <TableTd align="right">
                          {item.stock != null ? item.stock : '—'}
                        </TableTd>
                        <TableTd align="right">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={item.price}
                            onChange={(e) => updateLine(item.productId, 'price', e.target.value)}
                            className="pos-input-sm"
                            readOnly={item.orderedQty != null}
                          />
                        </TableTd>
                        <TableTd align="right">
                          <input
                            type="number"
                            min="1"
                            max={item.orderedQty != null
                              ? Math.min(item.orderedQty, item.stock ?? item.orderedQty)
                              : (item.stock ?? undefined)}
                            value={item.qty}
                            onChange={(e) => updateLine(item.productId, 'qty', e.target.value)}
                            className="pos-input-sm"
                            required
                          />
                        </TableTd>
                        <TableTd>
                          <input
                            type="text"
                            maxLength={100}
                            placeholder="Rusak, salah kirim..."
                            value={item.reason}
                            onChange={(e) => updateLine(item.productId, 'reason', e.target.value)}
                            className="pos-input-reason"
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
                <div className="pos-summary-row">
                  <span>Total Unit Diretur</span>
                  <strong>{totalQtyReturn}</strong>
                </div>
                <div className="pos-summary-row pos-summary-total">
                  <span>Total Nilai Retur</span>
                  <strong>{formatRupiah(grandTotal)}</strong>
                </div>
              </div>

              <div className="ui-actions-row">
                <Button variant="secondary" type="button" onClick={() => { setView('list'); resetForm() }}>
                  Batal
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Retur Pembelian'}
                </Button>
              </div>
            </Panel>
          </div>
        </form>
      )}
    </PageShell>
  )
}
