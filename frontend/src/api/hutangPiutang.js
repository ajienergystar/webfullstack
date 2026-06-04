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

function buildQuery(params) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      q.append(key, value)
    }
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const hutangPiutangApi = {
  list: (params) => request(`/api/hutang-piutang${buildQuery(params)}`),
  getById: (id) => request(`/api/hutang-piutang/${id}`),
  customers: () => request('/api/hutang-piutang/customers'),
  salesOptions: (customerId) => request(`/api/hutang-piutang/sales-options${buildQuery({ customerId })}`),
  create: (body) => request('/api/hutang-piutang', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/api/hutang-piutang/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/api/hutang-piutang/${id}`, { method: 'DELETE' }),
}
