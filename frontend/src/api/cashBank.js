const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Terjadi kesalahan')
  }
  return data
}

export const cashBankApi = {
  getFormData: () => request('/api/cash-bank/form-data'),
  listAccounts: (params = {}) => {
    const q = new URLSearchParams()
    if (params.search) q.set('search', params.search)
    if (params.accountType) q.set('accountType', params.accountType)
    const qs = q.toString()
    return request(`/api/cash-bank/accounts${qs ? `?${qs}` : ''}`)
  },
  getAccount: (id) => request(`/api/cash-bank/accounts/${id}`),
  createAccount: (body) =>
    request('/api/cash-bank/accounts', { method: 'POST', body: JSON.stringify(body) }),
  updateAccount: (id, body) =>
    request(`/api/cash-bank/accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAccount: (id) => request(`/api/cash-bank/accounts/${id}`, { method: 'DELETE' }),
  listTransactions: (params = {}) => {
    const q = new URLSearchParams()
    if (params.accountId) q.set('accountId', params.accountId)
    if (params.transactionType) q.set('transactionType', params.transactionType)
    if (params.dateFrom) q.set('dateFrom', params.dateFrom)
    if (params.dateTo) q.set('dateTo', params.dateTo)
    const qs = q.toString()
    return request(`/api/cash-bank/transactions${qs ? `?${qs}` : ''}`)
  },
  getTransaction: (id) => request(`/api/cash-bank/transactions/${id}`),
  createTransaction: (body) =>
    request('/api/cash-bank/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransaction: (id, body) =>
    request(`/api/cash-bank/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTransaction: (id) => request(`/api/cash-bank/transactions/${id}`, { method: 'DELETE' }),
}
