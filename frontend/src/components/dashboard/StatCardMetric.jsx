export default function StatCardMetric({ label, value, variant = 'teal', icon }) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-card-header">
        <span>{label}</span>
        {icon}
      </div>
      <div className="stat-card-body">{value}</div>
    </div>
  )
}
