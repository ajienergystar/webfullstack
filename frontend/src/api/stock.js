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

export const stockApi = {
  overview: (params) => request(`/api/stock/overview${buildQuery(params)}`),
  movements: (params) => request(`/api/stock/movements${buildQuery(params)}`),
  getFormData: () => request('/api/stock/form-data'),
  adjust: (body) => request('/api/stock/adjust', { method: 'POST', body: JSON.stringify(body) }),
  receive: (body) => request('/api/stock/receive', { method: 'POST', body: JSON.stringify(body) }),
}
