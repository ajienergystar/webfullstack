import '../styles/auth.css'

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
    </svg>
  )
}

export default function AuthCard({ title, children, footer, showIcon = true }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-accent" />
        <div className="auth-card-header">
          <h1 className="auth-card-title">{title}</h1>
          {showIcon && (
            <button type="button" className="auth-icon-btn" aria-label="Edit" title="Edit">
              <EditIcon />
            </button>
          )}
        </div>
        <div className="auth-card-body">{children}</div>
        {footer && <div className="auth-card-footer">{footer}</div>}
      </div>
    </div>
  )
}
