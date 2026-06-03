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

export const holdApi = {
  list: () => request('/api/hold'),
  getById: (id) => request(`/api/hold/${id}`),
  create: (body) => request('/api/hold', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/api/hold/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  cancel: (id) => request(`/api/hold/${id}`, { method: 'DELETE' }),
  complete: (id, body) => request(`/api/hold/${id}/complete`, { method: 'POST', body: JSON.stringify(body) }),
}
