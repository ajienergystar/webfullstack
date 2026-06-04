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

export const expensesApi = {
  list: (params = {}) => {
    const q = new URLSearchParams()
    if (params.search) q.set('search', params.search)
    if (params.dateFrom) q.set('dateFrom', params.dateFrom)
    if (params.dateTo) q.set('dateTo', params.dateTo)
    const qs = q.toString()
    return request(`/api/expenses${qs ? `?${qs}` : ''}`)
  },
  get: (id) => request(`/api/expenses/${id}`),
  create: (body) =>
    request('/api/expenses', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/api/expenses/${id}`, { method: 'DELETE' }),
}
