export default function FormField({
  label,
  children,
  className = '',
  as: Tag = 'label',
}) {
  return (
    <Tag className={`ui-field ${className}`.trim()}>
      {label}
      {children}
    </Tag>
  )
}
