export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
}) {
  if (!open) return null

  const sizeClass = size === 'sm' ? 'ui-modal-sm' : 'ui-modal-md'

  return (
    <div className="ui-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`ui-modal ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby={title ? 'ui-modal-title' : undefined}
      >
        {(title || onClose) && (
          <div className="ui-modal-header">
            <div>
              {title && <h2 id="ui-modal-title">{title}</h2>}
              {subtitle && <p>{subtitle}</p>}
            </div>
            {onClose && (
              <button type="button" className="ui-modal-close" onClick={onClose} aria-label="Tutup">
                ×
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
