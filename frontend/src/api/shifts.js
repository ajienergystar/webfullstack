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

export const shiftsApi = {
  getFormData: () => request('/api/shifts/form-data'),
  list: () => request('/api/shifts'),
  getById: (id) => request(`/api/shifts/${id}`),
  create: (body) => request('/api/shifts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/api/shifts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
}
