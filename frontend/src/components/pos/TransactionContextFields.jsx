import FormField from '../ui/FormField'

export default function TransactionContextFields({
  formData,
  outletId,
  userId,
  customerId,
  onOutletChange,
  onUserChange,
  onCustomerChange,
  showNotes,
  notes,
  onNotesChange,
}) {
  if (!formData) return null

  return (
    <>
      <div className="ui-form-grid ui-form-grid-3">
        <FormField label="Outlet">
          <select value={outletId} onChange={(e) => onOutletChange(e.target.value)} required>
            <option value="">Pilih outlet</option>
            {formData.outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.outletName}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Kasir">
          <select value={userId} onChange={(e) => onUserChange(e.target.value)} required>
            <option value="">Pilih kasir</option>
            {formData.users.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName} ({u.roleName})</option>
            ))}
          </select>
        </FormField>
        <FormField label="Pelanggan">
          <select value={customerId} onChange={(e) => onCustomerChange(e.target.value)}>
            <option value="">Walk-in</option>
            {formData.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customerName}{c.phoneNumber ? ` — ${c.phoneNumber}` : ''}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      {showNotes && (
        <FormField label="Catatan" className="pos-notes-field">
          <input
            type="text"
            placeholder="Opsional, mis. Meja 5"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </FormField>
      )}
    </>
  )
}
