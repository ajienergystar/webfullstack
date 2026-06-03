import Button from '../ui/Button'
import FormField from '../ui/FormField'
import Panel from '../ui/Panel'
import { PAYMENT_FILTER_OPTIONS } from '../../constants/pos'

export default function TransactionFilters({
  formData,
  dateFrom,
  dateTo,
  invoiceNumber,
  customerId,
  outletId,
  userId,
  paymentMethod,
  onChange,
  onSubmit,
  onReset,
}) {
  const set = (field) => (e) => onChange(field, e.target.value)

  return (
    <Panel className="pos-filters">
      <form onSubmit={onSubmit}>
        <div className="ui-form-grid ui-form-grid-4">
          <FormField label="Dari Tanggal">
            <input type="date" value={dateFrom} onChange={set('dateFrom')} />
          </FormField>
          <FormField label="Sampai Tanggal">
            <input type="date" value={dateTo} onChange={set('dateTo')} />
          </FormField>
          <FormField label="No. Invoice">
            <input
              type="text"
              placeholder="INV-..."
              value={invoiceNumber}
              onChange={set('invoiceNumber')}
            />
          </FormField>
          <FormField label="Pembayaran">
            <select value={paymentMethod} onChange={set('paymentMethod')}>
              {PAYMENT_FILTER_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Pelanggan">
            <select value={customerId} onChange={set('customerId')}>
              <option value="">Semua</option>
              {formData?.customers.map((c) => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Outlet">
            <select value={outletId} onChange={set('outletId')}>
              <option value="">Semua</option>
              {formData?.outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.outletName}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Kasir">
            <select value={userId} onChange={set('userId')}>
              <option value="">Semua</option>
              {formData?.users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="ui-actions-row">
          <Button variant="secondary" type="button" onClick={onReset}>Reset</Button>
          <Button variant="primary" type="submit">Cari</Button>
        </div>
      </form>
    </Panel>
  )
}
