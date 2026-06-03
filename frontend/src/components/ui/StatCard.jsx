export default function StatCard({ label, value }) {
  return (
    <div className="ui-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
