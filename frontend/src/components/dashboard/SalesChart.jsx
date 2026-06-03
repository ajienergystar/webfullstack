import { formatRupiah } from '../../utils/format'

export default function SalesChart({ data = [] }) {
  const maxAmount = Math.max(...data.map((p) => p.amount), 1)

  if (data.length === 0) {
    return <div className="chart-placeholder">Belum ada data penjualan</div>
  }

  return (
    <div className="pos-chart">
      {data.map((point) => (
        <div key={point.date} className="pos-chart-item">
          <div
            className="pos-chart-bar"
            style={{ height: `${Math.max((point.amount / maxAmount) * 100, 4)}%` }}
            title={formatRupiah(point.amount)}
          />
          <span className="pos-chart-label">{point.label}</span>
        </div>
      ))}
    </div>
  )
}
