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

export const salesApi = {
  getFormData: () => request('/api/sales/form-data'),
  createSale: (body) => request('/api/sales', { method: 'POST', body: JSON.stringify(body) }),
  getHistory: (params) => request(`/api/sales/history${buildQuery(params)}`),
  getTransaction: (id) => request(`/api/sales/${id}`),
}
