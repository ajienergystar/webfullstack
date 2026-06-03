export default function Alert({ variant = 'error', children, onDismiss }) {
  return (
    <div className={`ui-alert ui-alert-${variant}`} role="alert">
      {children}
      {onDismiss && (
        <button type="button" className="ui-alert-dismiss" onClick={onDismiss} aria-label="Tutup">
          ×
        </button>
      )}
    </div>
  )
}
