import { useNavigate } from 'react-router-dom'
import { authApi, clearAuth, getStoredUser } from '../../api/auth'

export default function TopNavbar({ onToggleSidebar }) {
  const navigate = useNavigate()
  const user = getStoredUser()

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    clearAuth()
    navigate('/signin')
  }

  return (
    <header className="dashboard-topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-toggle" onClick={onToggleSidebar} aria-label="Toggle menu">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
        <div className="topbar-logo">
          <span className="topbar-logo-badge">POS</span>
          <span>ERP Point Of Sale</span>
        </div>
      </div>

      <div className="topbar-right">
        <span>Welcome, {user?.fullName || 'User'}</span>
        <div className="topbar-user">
          <div className="topbar-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        </div>
        <button type="button" className="topbar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}
