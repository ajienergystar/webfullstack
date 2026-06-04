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

export const attendanceApi = {
  getFormData: () => request('/api/attendance/form-data'),
  list: () => request('/api/attendance'),
  getById: (id) => request(`/api/attendance/${id}`),
  create: (body) => request('/api/attendance', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
}
