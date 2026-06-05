import Button from '../ui/Button'
import FormField from '../ui/FormField'
import Panel from '../ui/Panel'
import { PAYMENT_FILTER_OPTIONS } from '../../constants/pos'

export default function OutletMonitoringFilters({
  formData,
  dateFrom,
  dateTo,
  outletId,
  paymentMethod,
  invoiceNumber,
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
            <input type="date" value={dateFrom} onChange={set('dateFrom')} required />
          </FormField>
          <FormField label="Sampai Tanggal">
            <input type="date" value={dateTo} onChange={set('dateTo')} required />
          </FormField>
          <FormField label="Cabang / Outlet">
            <select value={outletId} onChange={set('outletId')}>
              <option value="">Semua Cabang</option>
              {formData?.outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.outletName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Metode Pembayaran">
            <select value={paymentMethod} onChange={set('paymentMethod')}>
              {PAYMENT_FILTER_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="No. Invoice" className="pos-field-full">
            <input
              type="text"
              placeholder="Cari invoice tertentu (INV-...)"
              value={invoiceNumber}
              onChange={set('invoiceNumber')}
            />
          </FormField>
        </div>
        <div className="ui-actions-row">
          <Button variant="secondary" type="button" onClick={onReset}>
            Reset
          </Button>
          <Button variant="primary" type="submit">
            Tampilkan
          </Button>
        </div>
      </form>
    </Panel>
  )
}
