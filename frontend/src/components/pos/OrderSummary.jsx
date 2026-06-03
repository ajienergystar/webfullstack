import FormField from '../ui/FormField'
import { formatRupiah } from '../../utils/format'

export default function OrderSummary({
  lineSubTotal,
  headerDiscount,
  taxPercent,
  taxAmount,
  grandTotal,
  onDiscountChange,
  onTaxPercentChange,
  discountLabel = 'Diskon',
}) {
  return (
    <div className="pos-order-summary">
      <div className="pos-summary-row">
        <span>Subtotal</span>
        <strong>{formatRupiah(lineSubTotal)}</strong>
      </div>
      <div className="pos-summary-row">
        <FormField label={discountLabel}>
          <input
            type="number"
            min="0"
            step="500"
            value={headerDiscount}
            onChange={(e) => onDiscountChange(e.target.value)}
          />
        </FormField>
      </div>
      <div className="pos-summary-row">
        <FormField label="Pajak (%)">
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={taxPercent}
            onChange={(e) => onTaxPercentChange(e.target.value)}
          />
        </FormField>
        <strong>{formatRupiah(taxAmount)}</strong>
      </div>
      <div className="pos-summary-row pos-grand-total">
        <span>Grand Total</span>
        <strong>{formatRupiah(grandTotal)}</strong>
      </div>
    </div>
  )
}
