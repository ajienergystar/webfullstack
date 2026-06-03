export const PAYMENT_METHODS = ['Cash', 'QRIS', 'Transfer', 'Debit', 'Credit']

export const PAYMENT_FILTER_OPTIONS = [
  { value: '', label: 'Semua' },
  ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
]
