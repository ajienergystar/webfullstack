export default function PaymentBadge({ method }) {
  if (!method) return null
  const variant = method.toLowerCase()
  return <span className={`ui-badge ui-badge-${variant}`}>{method}</span>
}
