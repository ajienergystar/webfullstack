import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import { authApi } from '../api/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const data = await authApi.forgotPassword({ email })
      setSuccess(data.message)
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Reset Password"
      footer={
        <Link to="/signin">Kembali ke Login</Link>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        <p style={{ color: '#757575', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Masukkan email Anda. Kami akan mengirimkan instruksi reset password.
        </p>
        <div className="auth-field">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Loading...' : 'Send Reset Link'}
        </button>
      </form>
    </AuthCard>
  )
}
