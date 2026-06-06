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

export const backupsApi = {
  list: (params) => request(`/api/backups${buildQuery(params)}`),

  create: (body) => request('/api/backups', { method: 'POST', body: JSON.stringify(body) }),

  download: async (id, fileName) => {
    const res = await fetch(`${API_URL}/api/backups/${id}/download`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || data.message || 'Gagal mengunduh backup')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName || `backup_${id}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },

  restoreFromId: (id) =>
    request(`/api/backups/${id}/restore`, { method: 'POST' }),

  restoreFromFile: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_URL}/api/backups/restore`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Gagal restore database')
    }
    return data
  },

  remove: (id) => request(`/api/backups/${id}`, { method: 'DELETE' }),
}
