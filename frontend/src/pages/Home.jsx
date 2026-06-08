import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, clearAuth, getStoredUser } from '../api/auth'
import '../styles/home.css'

export default function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(getStoredUser())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    authApi.me()
      .then((profile) => {
        setUser(profile)
        setLoading(false)
      })
      .catch(() => {
        clearAuth()
        navigate('/signin')
      })
  }, [navigate])

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    clearAuth()
    navigate('/signin')
  }

  if (loading) {
    return (
      <div className="home-page">
        <p className="home-loading">Memuat...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="home-page">
        <p className="home-error">{error}</p>
      </div>
    )
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-accent" />
        <div className="home-header-inner">
          <h1>ERP Point Of Sale</h1>
          <button type="button" className="home-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="home-main">
        <section className="home-card">
          <div className="home-card-accent" />
          <h2 className="home-welcome">
            Welcome, <span>{user?.fullName}</span>
          </h2>
          <p className="home-subtitle">Anda berhasil masuk ke halaman Home.</p>

          <div className="home-info-grid">
            <div className="home-info-item">
              <label>Email</label>
              <span>{user?.email}</span>
            </div>
            <div className="home-info-item">
              <label>Phone</label>
              <span>{user?.phone || '-'}</span>
            </div>
            <div className="home-info-item">
              <label>Status Verifikasi</label>
              <span className={user?.isVerified ? 'badge verified' : 'badge pending'}>
                {user?.isVerified ? 'Verified' : 'Belum Verified'}
              </span>
            </div>
            <div className="home-info-item">
              <label>Status Akun</label>
              <span className={user?.isActive ? 'badge verified' : 'badge pending'}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {user?.lastLogin && (
              <div className="home-info-item">
                <label>Last Login</label>
                <span>{new Date(user.lastLogin).toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="home-info-item">
              <label>Member Since</label>
              <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-'}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
