import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import PasswordInput from '../components/PasswordInput'
import { authApi } from '../api/auth'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!token) {
      setError('Token reset tidak ditemukan. Gunakan link dari email Anda.')
      return
    }

    setLoading(true)
    try {
      const data = await authApi.resetPassword({
        token,
        newPassword: password,
        confirmPassword,
      })
      setSuccess(data.message)
      setTimeout(() => navigate('/signin'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthCard title="Reset Password" footer={<Link to="/forgot-password">Minta link baru</Link>}>
        <div className="auth-error">Link reset tidak valid. Silakan minta link baru.</div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset Password"
      footer={<Link to="/signin">Kembali ke Login</Link>}
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        <p style={{ color: '#757575', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Masukkan password baru Anda.
        </p>
        <PasswordInput
          placeholder="Password Baru"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="off"
        />
        <PasswordInput
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="off"
        />
        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Loading...' : 'Simpan Password'}
        </button>
      </form>
    </AuthCard>
  )
}
