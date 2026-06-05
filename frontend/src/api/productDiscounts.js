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

export const productDiscountsApi = {
  formData: () => request('/api/product-discounts/form-data'),
  list: (params = {}) => {
    const q = new URLSearchParams()
    if (params.search) q.set('search', params.search)
    if (params.discountType) q.set('discountType', params.discountType)
    if (params.isActive !== undefined && params.isActive !== '')
      q.set('isActive', params.isActive)
    const qs = q.toString()
    return request(`/api/product-discounts${qs ? `?${qs}` : ''}`)
  },
  get: (id) => request(`/api/product-discounts/${id}`),
  create: (body) =>
    request('/api/product-discounts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/product-discounts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/api/product-discounts/${id}`, { method: 'DELETE' }),
}
