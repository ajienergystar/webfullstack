import FormField from '../ui/FormField'
import { PAYMENT_METHODS } from '../../constants/pos'
import { formatRupiah } from '../../utils/format'

export default function PaymentForm({
  paymentMethod,
  paidAmount,
  changeAmount,
  grandTotal,
  onPaymentMethodChange,
  onPaidAmountChange,
  layout = 'row',
  methodLabel = 'Metode Bayar',
  amountLabel = 'Jumlah Bayar',
  showChange = true,
}) {
  const gridClass = layout === 'grid' ? 'pos-payment-grid' : 'pos-payment-row'

  return (
    <div className={gridClass}>
      <FormField label={methodLabel}>
        <select value={paymentMethod} onChange={(e) => onPaymentMethodChange(e.target.value)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </FormField>
      {amountLabel && (
        <FormField label={amountLabel}>
          <input
            type="number"
            min="0"
            step="1000"
            value={paidAmount}
            onChange={(e) => onPaidAmountChange(e.target.value)}
            placeholder={grandTotal != null ? formatRupiah(grandTotal) : ''}
          />
        </FormField>
      )}
      {showChange && (
        <div className="pos-change">
          <span>Kembalian</span>
          <strong>{formatRupiah(changeAmount)}</strong>
        </div>
      )}
    </div>
  )
}
