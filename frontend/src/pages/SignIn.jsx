import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import { authApi, saveAuth } from '../api/auth'

export default function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.signIn({ email, password })
      saveAuth(data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Login to your account"
      footer={
        <Link to="/forgot-password">Forgot your password?</Link>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-field">
          <input
            type="email"
            placeholder="Username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="auth-field">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
      <div className="auth-footer-links" style={{ marginTop: '1rem', textAlign: 'center' }}>
        <span className="divider">Belum punya akun?</span>
        <Link to="/signup">Daftar sekarang</Link>
      </div>
    </AuthCard>
  )
}
