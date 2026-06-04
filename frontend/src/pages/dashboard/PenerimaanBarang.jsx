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
import { formatDateTime } from '../../utils/format'

function cartItemFromProduct(product) {
  return {
    productId: product.id,
    productCode: product.productCode,
    productName: product.productName,
    unit: product.unit,
    orderedQty: null,
    qty: 1,
  }
}

const emptyHeader = {
  referenceNumber: '',
  purchaseId: '',
}

function groupGoodsReceipts(movements) {
  const map = new Map()
  for (const m of movements ?? []) {
    const ref = m.referenceNumber || ''
    if (!ref.startsWith('GRN')) continue
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

export default function PenerimaanBarang() {
  const [view, setView] = useState('list')
  const [formMeta, setFormMeta] = useState(null)
  const [purchaseList, setPurchaseList] = useState(null)
  const [movements, setMovements] = useState(null)
  const [detail, setDetail] = useState(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [header, setHeader] = useState(emptyHeader)
  const [lines, setLines] = useState([])

  const loadMovements = useCallback(async () => {
    const data = await stockApi.movements({
      movementType: 'IN',
      search: search || 'GRN',
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

  const receipts = useMemo(
    () => groupGoodsReceipts(movements?.movements),
    [movements],
  )

  const totalQtyReceived = useMemo(
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
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, cartItemFromProduct(product)]
    })
  }

  const updateLine = (productId, value) => {
    const qty = Math.max(1, Number(value) || 1)
    setLines((prev) => prev.map((item) => (
      item.productId === productId ? { ...item, qty } : item
    )))
  }

  const removeLine = (productId) => {
    setLines((prev) => prev.filter((i) => i.productId !== productId))
  }

  const resetForm = () => {
    setHeader(emptyHeader)
    setLines([])
    setDetail(null)
  }

  const openCreate = () => {
    resetForm()
    setView('form')
    setError('')
    setSuccess('')
  }

  const openDetail = (referenceNumber) => {
    const group = receipts.find((r) => r.referenceNumber === referenceNumber)
    if (group) {
      setDetail(group)
      setView('detail')
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
        referenceNumber: prev.referenceNumber,
      }))
      setLines(record.details.map((line) => ({
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        unit: line.unit,
        orderedQty: line.qty,
        qty: line.qty,
      })))
    } catch (err) {
      setError(err.message)
    }
  }

  const handlePurchaseChange = (value) => {
    updateHeader('purchaseId', value)
    if (value) loadFromPurchaseOrder(value)
    else setLines([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (lines.length === 0) {
      setError('Minimal satu produk wajib ditambahkan.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await stockApi.receive({
        referenceNumber: header.referenceNumber.trim() || null,
        purchaseId: header.purchaseId ? Number(header.purchaseId) : null,
        items: lines.map((item) => ({
          productId: item.productId,
          qty: item.qty,
        })),
      })
      setSuccess(
        `Penerimaan ${result.referenceNumber} tersimpan — ${result.lineCount} produk, ${result.totalQty} unit masuk ke stok.`,
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
      + Penerimaan Baru
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
      ← Daftar Penerimaan
    </Button>
  )

  return (
    <PageShell
      title="Penerimaan Barang"
      description="Penerimaan fisik barang (StockMovements IN) — dapat mengacu ke Purchase Order"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat penerimaan barang..."
      error={!movements && error ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi (init.sql) dan backend berjalan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && movements && <div className="ui-alert ui-alert-error">{error}</div>}

      {movements && view === 'list' && (
        <>
          <div className="pos-stat-row">
            <StatCard label="Dokumen Penerimaan" value={receipts.length} />
            <StatCard
              label="Total Unit Diterima (GRN)"
              value={receipts.reduce((s, r) => s + r.totalQty, 0)}
            />
          </div>

          <Panel title="Riwayat Penerimaan Barang">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari">
                <input
                  type="text"
                  placeholder="No. GRN, produk, atau PO..."
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
                  <TableTh>No. Penerimaan (GRN)</TableTh>
                  <TableTh>Referensi PO</TableTh>
                  <TableTh>Tanggal</TableTh>
                  <TableTh align="right">Produk</TableTh>
                  <TableTh align="right">Total Qty</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!receipts.length ? (
                  <TableEmpty colSpan={6}>Belum ada penerimaan barang (GRN)</TableEmpty>
                ) : (
                  receipts.map((row) => (
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
        <Panel title={`Detail Penerimaan — ${detail.referenceNumber.split('|')[0]}`}>
          <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
            <FormField label="Referensi PO">
              <input type="text" readOnly value={parsePoFromReference(detail.referenceNumber) || '—'} />
            </FormField>
            <FormField label="Tanggal Penerimaan">
              <input type="text" readOnly value={formatDateTime(detail.createdAt)} />
            </FormField>
            <FormField label="Total Qty Diterima">
              <input type="text" readOnly value={String(detail.totalQty)} />
            </FormField>
          </div>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableTh>Produk</TableTh>
                <TableTh align="right">Qty Diterima</TableTh>
                <TableTh>Tanggal Catat</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableTd>
                    <div className="pos-cart-product">{line.productName}</div>
                    <div className="pos-cart-code">{line.productCode}</div>
                  </TableTd>
                  <TableTd align="right" emphasize>{line.qty}</TableTd>
                  <TableTd>{formatDateTime(line.createdAt)}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </Panel>
      )}

      {view === 'form' && (
        <form onSubmit={handleSubmit}>
          <Panel title="Form Penerimaan Barang">
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="No. Penerimaan (GRN)">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Kosongkan untuk auto (GRN-YYYYMMDD-####)"
                  value={header.referenceNumber}
                  onChange={(e) => updateHeader('referenceNumber', e.target.value)}
                />
              </FormField>
              <FormField label="Referensi Purchase Order">
                <select
                  value={header.purchaseId}
                  onChange={(e) => handlePurchaseChange(e.target.value)}
                >
                  <option value="">— Tanpa PO / penerimaan langsung —</option>
                  {purchaseList?.purchases?.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.invoiceNumber || `PO-${po.id}`}
                      {po.supplierName ? ` — ${po.supplierName}` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <p className="pos-form-hint">
              Data disimpan ke tabel StockMovements (MovementType IN) dan Products.Stock diperbarui.
              Jika PO sudah menambah stok saat dibuat, penerimaan berdasarkan PO yang sama akan menambah stok lagi.
            </p>
          </Panel>

          <div className="pos-checkout-layout" style={{ marginTop: '1rem' }}>
            <ProductSearchGrid
              products={formMeta?.products ?? []}
              onSelect={addProduct}
              respectStock={false}
              priceField="purchasePrice"
              priceLabel="Harga beli"
              searchPlaceholder="Cari produk untuk diterima..."
            />

            <Panel title="Item Diterima" className="pos-cart-panel">
              <DataTable className="pos-cart-table">
                <TableHead>
                  <TableRow>
                    <TableTh>Produk</TableTh>
                    <TableTh align="right">Qty PO</TableTh>
                    <TableTh align="right">Qty Diterima *</TableTh>
                    <TableTh align="actions" aria-label="Aksi" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableEmpty colSpan={4}>
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
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateLine(item.productId, e.target.value)}
                            className="pos-input-sm"
                            required
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
                    ))
                  )}
                </TableBody>
              </DataTable>

              <div className="pos-order-summary" style={{ marginTop: '1rem' }}>
                <div className="pos-summary-row pos-summary-total">
                  <span>Total Unit Diterima</span>
                  <strong>{totalQtyReceived}</strong>
                </div>
              </div>

              <div className="ui-actions-row">
                <Button variant="secondary" type="button" onClick={() => { setView('list'); resetForm() }}>
                  Batal
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Penerimaan Barang'}
                </Button>
              </div>
            </Panel>
          </div>
        </form>
      )}
    </PageShell>
  )
}
