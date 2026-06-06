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

export const onlineOrdersApi = {
  list: (params) => request(`/api/online-orders${buildQuery(params)}`),
  getById: (id) => request(`/api/online-orders/${id}`),
  updateStatus: (id, body) =>
    request(`/api/online-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  complete: (id, body) =>
    request(`/api/online-orders/${id}/complete`, { method: 'POST', body: JSON.stringify(body) }),
}
