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

export const purchasesApi = {
  formData: () => request('/api/purchases/form-data'),
  list: (params) => request(`/api/purchases${buildQuery(params)}`),
  get: (id) => request(`/api/purchases/${id}`),
  create: (body) =>
    request('/api/purchases', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/purchases/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/api/purchases/${id}`, { method: 'DELETE' }),
}
