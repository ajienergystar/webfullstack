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

export const usersApi = {
  getFormData: () => request('/api/users/form-data'),
  list: () => request('/api/users'),
  getById: (id) => request(`/api/users/${id}`),
  create: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
}
