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
      q.set(key, String(value))
    }
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const shiftsApi = {
  getFormData: () => request('/api/shifts/form-data'),
  getReport: (params = {}) => request(`/api/shifts/report${buildQuery(params)}`),
  list: () => request('/api/shifts'),
  getById: (id) => request(`/api/shifts/${id}`),
  create: (body) => request('/api/shifts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/api/shifts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
}
