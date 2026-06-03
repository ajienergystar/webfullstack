const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0)
}

export function formatTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export async function fetchDashboard() {
  const res = await fetch(`${API_URL}/api/dashboard`)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Gagal memuat data dashboard')
  }

  return data
}
