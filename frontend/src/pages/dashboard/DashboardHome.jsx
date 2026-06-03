import { useEffect, useState } from 'react'
import { fetchDashboard, formatRupiah, formatTime } from '../../api/dashboard'

export default function DashboardHome() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError('')
        const result = await fetchDashboard()
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Gagal memuat data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="dashboard-loading">Memuat data POS...</div>
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <p className="dashboard-error-hint">
          Jalankan script SQL di <code>database/pos/init.sql</code> ke SQL Server, lalu pastikan API berjalan.
        </p>
      </div>
    )
  }

  const stats = data?.stats ?? {}
  const salesChart = data?.salesChart ?? []
  const recentTransactions = data?.recentTransactions ?? []
  const topProducts = data?.topProducts ?? []
  const maxChartAmount = Math.max(...salesChart.map((p) => p.amount), 1)

  return (
    <>
      <div className="stats-row">
        <div className="stat-card teal">
          <div className="stat-card-header">
            <span>Penjualan Hari Ini</span>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
          </div>
          <div className="stat-card-body">{formatRupiah(stats.todaySales)}</div>
        </div>

        <div className="stat-card red">
          <div className="stat-card-header">
            <span>Omzet Bulanan</span>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
          </div>
          <div className="stat-card-body">{formatRupiah(stats.monthlyRevenue)}</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-card-header">
            <span>Produk Terlaris</span>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div className="stat-card-body">
            {stats.topProductName} ({stats.topProductSold} terjual)
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-card-header">
            <span>Stok Menipis</span>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <div className="stat-card-body">
            {stats.lowStockCount} produk perlu restock
          </div>
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="panel-title">Grafik Penjualan (7 Hari Terakhir)</div>
        <div className="panel-body">
          {salesChart.length === 0 ? (
            <div className="chart-placeholder">Belum ada data penjualan</div>
          ) : (
            <div className="sales-chart">
              {salesChart.map((point) => (
                <div key={point.date} className="sales-chart-item">
                  <div
                    className="sales-chart-bar"
                    style={{ height: `${Math.max((point.amount / maxChartAmount) * 100, 4)}%` }}
                    title={formatRupiah(point.amount)}
                  />
                  <span className="sales-chart-label">{point.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div className="dashboard-panel">
          <div className="panel-title">Transaksi Terakhir</div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Pelanggan</th>
                  <th>Total</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>
                      Tidak ada transaksi
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.invoiceNumber}>
                      <td>{tx.invoiceNumber}</td>
                      <td>{tx.customerName}</td>
                      <td>{formatRupiah(tx.grandTotal)}</td>
                      <td>{formatTime(tx.transactionDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-title">Produk Terlaris</div>
          <div className="panel-body">
            <div className="product-grid">
              {topProducts.length === 0 ? (
                <p style={{ color: '#888' }}>Belum ada data penjualan produk</p>
              ) : (
                topProducts.map((p) => (
                  <div key={p.productName} className="product-card">
                    <div className="product-card-title">{p.productName}</div>
                    <div className="product-card-image">{p.totalSold} terjual</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
