const VARIANT_CLASS = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  success: 'ui-btn-success',
  danger: 'ui-btn-danger',
}

export default function Button({
  variant = 'primary',
  size,
  type = 'button',
  disabled,
  className = '',
  children,
  ...props
}) {
  const classes = [
    'ui-btn',
    VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary,
    size === 'sm' ? 'ui-btn-sm' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
