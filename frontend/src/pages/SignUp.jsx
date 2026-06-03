import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import PasswordInput from '../components/PasswordInput'
import { authApi, saveAuth } from '../api/auth'

export default function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    setLoading(true)
    try {
      const data = await authApi.signUp({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || null,
        password: form.password,
      })
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
      title="Create an account"
      footer={
        <div className="auth-footer-links">
          <Link to="/signin">Sudah punya akun? Login</Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-field">
          <input
            type="text"
            placeholder="Full Name"
            value={form.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            required
          />
        </div>
        <div className="auth-field">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="auth-field">
          <input
            type="tel"
            placeholder="Phone (opsional)"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </div>
        <PasswordInput
          id="signup-password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          required
          minLength={6}
          autoComplete="off"
        />
        <PasswordInput
          id="signup-confirm-password"
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          required
          autoComplete="off"
        />
        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Loading...' : 'Sign Up'}
        </button>
      </form>
    </AuthCard>
  )
}
