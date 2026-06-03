import FormField from '../ui/FormField'

export const emptyProductForm = {
  categoryId: '',
  brandId: '',
  productCode: '',
  productName: '',
  barcode: '',
  purchasePrice: '',
  sellingPrice: '',
  stock: '0',
  unit: '',
  isActive: true,
}

export function productToForm(product) {
  return {
    categoryId: product.categoryId != null ? String(product.categoryId) : '',
    brandId: product.brandId != null ? String(product.brandId) : '',
    productCode: product.productCode || '',
    productName: product.productName || '',
    barcode: product.barcode || '',
    purchasePrice: String(product.purchasePrice ?? ''),
    sellingPrice: String(product.sellingPrice ?? ''),
    stock: String(product.stock ?? 0),
    unit: product.unit || '',
    isActive: product.isActive !== false,
  }
}

export function formToPayload(form) {
  return {
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    brandId: form.brandId ? Number(form.brandId) : null,
    productCode: form.productCode.trim() || null,
    productName: form.productName.trim(),
    barcode: form.barcode.trim() || null,
    purchasePrice: Number(form.purchasePrice) || 0,
    sellingPrice: Number(form.sellingPrice) || 0,
    stock: Number(form.stock) || 0,
    unit: form.unit.trim() || null,
    isActive: form.isActive,
  }
}

export default function ProductFormFields({ form, onChange, categories = [], brands = [], isEdit = false }) {
  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    onChange({ ...form, [field]: value })
  }

  return (
    <div className="ui-form-grid ui-form-grid-3">
      <FormField label="Kode Produk">
        <input
          type="text"
          placeholder={isEdit ? '' : 'Kosongkan untuk auto-generate'}
          value={form.productCode}
          onChange={set('productCode')}
        />
      </FormField>
      <FormField label="Nama Produk *">
        <input
          type="text"
          placeholder="Nama produk"
          value={form.productName}
          onChange={set('productName')}
          required
        />
      </FormField>
      <FormField label="Kategori">
        <select value={form.categoryId} onChange={set('categoryId')}>
          <option value="">— Tanpa kategori —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.categoryName}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Brand / Merk">
        <select value={form.brandId} onChange={set('brandId')}>
          <option value="">— Tanpa brand —</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.brandName}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Barcode">
        <input
          type="text"
          placeholder="Scan / ketik barcode"
          value={form.barcode}
          onChange={set('barcode')}
        />
      </FormField>
      <FormField label="Satuan">
        <input
          type="text"
          placeholder="pcs, botol, kg..."
          value={form.unit}
          onChange={set('unit')}
        />
      </FormField>
      <FormField label={isEdit ? 'Stok' : 'Stok Awal'}>
        <input
          type="number"
          min="0"
          value={form.stock}
          onChange={set('stock')}
        />
      </FormField>
      <FormField label="Harga Beli (Rp)">
        <input
          type="number"
          min="0"
          step="100"
          value={form.purchasePrice}
          onChange={set('purchasePrice')}
        />
      </FormField>
      <FormField label="Harga Jual (Rp) *">
        <input
          type="number"
          min="0"
          step="100"
          value={form.sellingPrice}
          onChange={set('sellingPrice')}
          required
        />
      </FormField>
      <FormField label="Status">
        <label className="pos-checkbox-label">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={set('isActive')}
          />
          Aktif (tampil di kasir)
        </label>
      </FormField>
    </div>
  )
}
