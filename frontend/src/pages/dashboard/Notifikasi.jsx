import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { notificationsApi } from '../../api/notifications'
import Button from '../../components/ui/Button'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import { TableBadge } from '../../components/ui/Table'
import { formatRelativeTime } from '../../utils/format'

const READ_STORAGE_KEY = 'pos-notifications-read'

const TYPE_LABELS = {
  LOW_STOCK: 'Stok Menipis',
  HUTANG_PIUTANG: 'Hutang / Piutang',
  SHIFT_OPEN: 'Shift Kasir',
  VOUCHER_EXPIRING: 'Voucher',
  MEMBERSHIP_EXPIRING: 'Membership',
  HOLD_TRANSACTION: 'Hold Transaksi',
  AUDIT_LOG: 'Audit Log',
}

const SEVERITY_BADGE = {
  danger: 'danger',
  warning: 'warning',
  info: 'info',
}

const FILTER_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'inventory', label: 'Inventori' },
  { id: 'finance', label: 'Keuangan' },
  { id: 'system', label: 'Sistem' },
]

const ICONS = {
  danger: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  ),
}

function loadReadIds() {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveReadIds(ids) {
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids))
}

export default function Notifikasi() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [readIds, setReadIds] = useState(loadReadIds)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await notificationsApi.list()
      setData(result)
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const items = data?.items ?? []
  const summary = data?.summary ?? {}

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.category === filter)
  }, [items, filter])

  const unreadCount = useMemo(
    () => items.filter((item) => !readIds.includes(item.id)).length,
    [items, readIds],
  )

  const markAsRead = (id) => {
    if (readIds.includes(id)) return
    const next = [...readIds, id]
    setReadIds(next)
    saveReadIds(next)
  }

  const markAllAsRead = () => {
    const next = items.map((item) => item.id)
    setReadIds(next)
    saveReadIds(next)
  }

  const pageActions = (
    <>
      <Button variant="secondary" type="button" onClick={loadData} disabled={loading}>
        Muat Ulang
      </Button>
      {unreadCount > 0 && (
        <Button variant="primary" type="button" onClick={markAllAsRead}>
          Tandai Semua Dibaca
        </Button>
      )}
    </>
  )

  return (
    <PageShell
      title="Notifikasi"
      description="Peringatan otomatis dari data POS — stok, hutang/piutang, shift kasir, voucher, membership, dan aktivitas sistem"
      actions={pageActions}
      loading={loading}
      loadingMessage="Memuat notifikasi..."
      error={error}
      errorHint="Jalankan database/pos/init.sql dan pastikan API berjalan."
    >
      <div className="ui-stat-row">
        <StatCard label="Total Notifikasi" value={summary.total ?? 0} />
        <StatCard label="Belum Dibaca" value={unreadCount} />
        <StatCard label="Peringatan" value={summary.warning ?? 0} />
        <StatCard label="Kritis" value={summary.danger ?? 0} />
      </div>

      <Panel>
        <div className="notif-toolbar">
          <div className="notif-filters">
            {FILTER_TABS.map((tab) => {
              const count =
                tab.id === 'all'
                  ? summary.total ?? 0
                  : summary[tab.id] ?? 0
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`notif-filter-btn${filter === tab.id ? ' is-active' : ''}`}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                  <span className="notif-filter-count">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <p className="notif-empty">Tidak ada notifikasi untuk filter ini.</p>
        ) : (
          <ul className="notif-list">
            {filteredItems.map((item) => {
              const isRead = readIds.includes(item.id)
              const severity = item.severity || 'info'
              const content = (
                <>
                  <div className={`notif-icon notif-icon-${severity}`}>
                    {ICONS[severity] ?? ICONS.info}
                  </div>
                  <div className="notif-body">
                    <div className="notif-header">
                      <strong className="notif-title">{item.title}</strong>
                      <TableBadge variant={SEVERITY_BADGE[severity] ?? 'info'}>
                        {TYPE_LABELS[item.type] ?? item.type}
                      </TableBadge>
                    </div>
                    <p className="notif-message">{item.message}</p>
                    <span className="notif-time">{formatRelativeTime(item.createdAt)}</span>
                  </div>
                  {!isRead && <span className="notif-unread-dot" title="Belum dibaca" />}
                </>
              )

              return (
                <li
                  key={item.id}
                  className={`notif-item${isRead ? ' is-read' : ''}`}
                >
                  {item.linkPath ? (
                    <Link
                      to={item.linkPath}
                      className="notif-link"
                      onClick={() => markAsRead(item.id)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="notif-link notif-link-button"
                      onClick={() => markAsRead(item.id)}
                    >
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </PageShell>
  )
}
