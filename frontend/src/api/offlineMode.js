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

export const offlineModeApi = {
  list: (params) => request(`/api/offline-mode${buildQuery(params)}`),
  getDevice: (id) => request(`/api/offline-mode/devices/${id}`),
  updateDevice: (id, body) =>
    request(`/api/offline-mode/devices/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  syncDevice: (id, syncType) =>
    request(`/api/offline-mode/devices/${id}/sync${buildQuery({ syncType })}`, { method: 'POST' }),
  retryQueue: (id) =>
    request(`/api/offline-mode/queue/${id}/retry`, { method: 'POST' }),
}
