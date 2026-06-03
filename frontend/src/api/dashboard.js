import { formatRupiah, formatTime } from '../utils/format'

export { formatRupiah, formatTime }

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export async function fetchDashboard() {
  const res = await fetch(`${API_URL}/api/dashboard`)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Gagal memuat data dashboard')
  }

  return data
}
