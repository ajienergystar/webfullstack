import { useCallback, useEffect, useState } from 'react'
import { salesApi } from '../api/sales'

export function useSalesFormData() {
  const [formData, setFormData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [outletId, setOutletId] = useState('')
  const [userId, setUserId] = useState('')

  const applyDefaults = useCallback((data) => {
    const cashier = data.users.find((u) => u.roleName === 'Cashier') ?? data.users[0]
    if (cashier) setUserId(String(cashier.id))
    if (data.outlets[0]) setOutletId(String(data.outlets[0].id))
  }, [])

  const refresh = useCallback(async () => {
    const data = await salesApi.getFormData()
    setFormData(data)
    return data
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')
        const data = await salesApi.getFormData()
        if (cancelled) return
        setFormData(data)
        applyDefaults(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [applyDefaults])

  return {
    formData,
    loading,
    error,
    setError,
    outletId,
    setOutletId,
    userId,
    setUserId,
    refresh,
  }
}
