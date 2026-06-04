/**
 * Reusable data table (template: bordered wrap, gray header, row dividers, pill badges).
 * Use composition: DataTable > TableHead/TableBody > TableRow > TableTh/TableTd.
 */

const ALIGN_CLASS = {
  right: 'ui-table-cell-amount',
  actions: 'ui-table-cell-actions',
}

const BADGE_PILL = {
  success: 'ui-badge-pill ui-badge-pill-success',
  danger: 'ui-badge-pill ui-badge-pill-danger',
  muted: 'ui-badge-pill ui-badge-pill-muted',
  info: 'ui-badge-pill ui-badge-pill-info',
  warning: 'ui-badge-pill ui-badge-pill-warning',
  default: 'ui-badge-pill ui-badge-pill-default-tag',
}

function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function DataTable({ children, className = '' }) {
  return (
    <div className={cn('ui-table-wrap', className)}>
      <table className="ui-table">{children}</table>
    </div>
  )
}

export function TableHead({ children }) {
  return <thead>{children}</thead>
}

export function TableBody({ children }) {
  return <tbody>{children}</tbody>
}

export function TableRow({ children, className = '' }) {
  return <tr className={className || undefined}>{children}</tr>
}

export function TableTh({ children, align, className = '', ...rest }) {
  return (
    <th className={cn(ALIGN_CLASS[align], className)} {...rest}>
      {children}
    </th>
  )
}

export function TableTd({
  children,
  align,
  muted = false,
  amount = false,
  emphasize = false,
  className = '',
  ...rest
}) {
  const content = amount || emphasize ? <strong>{children}</strong> : children
  return (
    <td className={cn(ALIGN_CLASS[align], muted && 'ui-table-cell-muted', className)} {...rest}>
      {content}
    </td>
  )
}

export function TableEmpty({ colSpan, children }) {
  return (
    <TableRow>
      <td colSpan={colSpan} className="ui-table-empty">
        {children}
      </td>
    </TableRow>
  )
}

export function TableEmptyMessage({ children, style }) {
  return (
    <p className="ui-table-empty" style={{ padding: '1.5rem', ...style }}>
      {children}
    </p>
  )
}

export function TableLink({ children, className = '', as: Tag = 'span', ...rest }) {
  return (
    <Tag className={cn('ui-table-link', className)} {...rest}>
      {children}
    </Tag>
  )
}

export function TableSubtext({ children }) {
  return <span className="ui-table-subtext">{children}</span>
}

export function TablePrimaryCell({ children }) {
  return <div className="ui-table-primary-cell">{children}</div>
}

export function TableBadge({ variant = 'muted', children, className = '' }) {
  return (
    <span className={cn(BADGE_PILL[variant] || BADGE_PILL.muted, className)}>
      {children}
    </span>
  )
}

export function TableActions({ children }) {
  return (
    <TableTd align="actions">
      <div className="pos-actions-cell">{children}</div>
    </TableTd>
  )
}

/** @returns {'success' | 'muted'} */
export function badgeVariantActive(isActive) {
  return isActive ? 'success' : 'muted'
}

/** @returns {keyof typeof BADGE_PILL} */
export function badgeVariantRecordStatus(status) {
  if (status === 'PAID') return 'success'
  if (status === 'CANCELLED') return 'muted'
  if (status === 'PARTIAL') return 'warning'
  return 'info'
}

/** @returns {'success' | 'danger'} */
export function badgeVariantInOut(type) {
  return type === 'IN' ? 'success' : 'danger'
}
