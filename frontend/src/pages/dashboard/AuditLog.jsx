import { useCallback, useEffect, useState } from 'react'
import { auditLogsApi } from '../../api/auditLogs'
import { usersApi } from '../../api/users'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import Modal from '../../components/ui/Modal'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  DataTable,
  TableActions,
  TableBadge,
  TableBody,
  TableEmpty,
  TableHead,
  TablePrimaryCell,
  TableRow,
  TableSubtext,
  TableTd,
  TableTh,
} from '../../components/ui/Table'
import { monthStartStr, todayStr } from '../../utils/date'
import { formatDateTime } from '../../utils/format'

const TABLE_LABELS = {
  SalesTransactions: 'Penjualan',
  HeldTransactions: 'Hold Transaksi',
  Refunds: 'Refund',
  OnlineOrders: 'Online Order',
}

function tableLabel(name) {
  if (!name) return '—'
  return TABLE_LABELS[name] || name
}

function actionBadgeVariant(action) {
  const text = (action || '').toLowerCase()
  if (text.startsWith('create') || text.includes('tambah') || text.includes('buat')) return 'success'
  if (text.includes('delete') || text.includes('hapus') || text.includes('cancel') || text.includes('batal')) {
    return 'danger'
  }
  if (text.includes('update') || text.includes('edit') || text.includes('ubah') || text.includes('perbarui')) {
    return 'warning'
  }
  return 'info'
}

function actionCategory(action) {
  const text = (action || '').toLowerCase()
  if (text.startsWith('create') || text.includes('tambah') || text.includes('buat')) return 'Buat'
  if (text.includes('delete') || text.includes('hapus')) return 'Hapus'
  if (text.includes('cancel') || text.includes('batal')) return 'Batal'
  if (text.includes('update') || text.includes('edit') || text.includes('ubah') || text.includes('perbarui')) {
    return 'Ubah'
  }
  return 'Aktivitas'
}

export default function AuditLog() {
  const [listData, setListData] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)

  const [filters, setFilters] = useState({
    search: '',
    dateFrom: monthStartStr(),
    dateTo: todayStr(),
    userId: '',
    tableName: '',
  })

  const loadList = useCallback(async (f) => {
    setLoading(true)
    setError('')
    try {
      const data = await auditLogsApi.list({
        search: f.search || undefined,
        dateFrom: f.dateFrom || undefined,
        dateTo: f.dateTo || undefined,
        userId: f.userId || undefined,
        tableName: f.tableName || undefined,
      })
      setListData(data)
    } catch (err) {
      setError(err.message)
      setListData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    usersApi.list()
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadList(filters)
  }, [loadList])

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    loadList(filters)
  }

  const handleFilterReset = () => {
    const reset = {
      search: '',
      dateFrom: monthStartStr(),
      dateTo: todayStr(),
      userId: '',
      tableName: '',
    }
    setFilters(reset)
    loadList(reset)
  }

  const pageActions = (
    <Button
      variant="secondary"
      type="button"
      onClick={() => loadList(filters)}
      disabled={loading}
    >
      Muat Ulang
    </Button>
  )

  const tableOptions = listData?.tableNames?.length
    ? listData.tableNames
    : Object.keys(TABLE_LABELS)

  return (
    <PageShell
      title="Audit Log"
      description="Riwayat aktivitas sistem dari tabel AuditLogs — penjualan, hold, refund, dan online order"
      actions={pageActions}
      loading={loading && !listData}
      loadingMessage="Memuat audit log..."
      error={error && !listData ? error : undefined}
      errorHint="Jalankan database/pos/init.sql dan pastikan API berjalan."
    >
      {error && listData && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && (
        <div className="pos-stat-row">
          <StatCard label="Total Log" value={listData.totalCount} />
          <StatCard label="Hari Ini" value={listData.todayCount} />
          <StatCard label="Pengguna Aktif" value={listData.uniqueUserCount} />
          <StatCard label="Modul Terpantau" value={listData.tableNames?.length ?? 0} />
        </div>
      )}

      <Panel className="pos-product-filters">
        <form onSubmit={handleFilterSubmit} className="pos-refund-list-filter">
          <FormField label="Cari">
            <input
              type="text"
              placeholder="Aksi, modul, pengguna, ID record..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </FormField>
          <FormField label="Dari Tanggal">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </FormField>
          <FormField label="Sampai Tanggal">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </FormField>
          <FormField label="Pengguna">
            <select value={filters.userId} onChange={(e) => handleFilterChange('userId', e.target.value)}>
              <option value="">Semua</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.username}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Modul / Tabel">
            <select value={filters.tableName} onChange={(e) => handleFilterChange('tableName', e.target.value)}>
              <option value="">Semua</option>
              {tableOptions.map((name) => (
                <option key={name} value={name}>
                  {tableLabel(name)}
                </option>
              ))}
            </select>
          </FormField>
          <div className="ui-actions-row">
            <Button variant="secondary" type="button" onClick={handleFilterReset}>
              Reset
            </Button>
            <Button variant="primary" type="submit">
              Terapkan Filter
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Riwayat Aktivitas">
        <DataTable>
          <TableHead>
            <TableRow>
              <TableTh>ID</TableTh>
              <TableTh>Waktu</TableTh>
              <TableTh>Pengguna</TableTh>
              <TableTh>Jenis</TableTh>
              <TableTh>Aksi</TableTh>
              <TableTh>Modul</TableTh>
              <TableTh align="right">Record ID</TableTh>
              <TableTh align="actions" aria-label="Aksi" />
            </TableRow>
          </TableHead>
          <TableBody>
            {!listData?.logs?.length ? (
              <TableEmpty colSpan={8}>Tidak ada audit log untuk filter ini</TableEmpty>
            ) : (
              listData.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableTd muted>#{log.id}</TableTd>
                  <TableTd>{formatDateTime(log.createdAt)}</TableTd>
                  <TableTd>
                    <TablePrimaryCell>
                      {log.userFullName || 'Sistem'}
                      {log.username && (
                        <TableSubtext>@{log.username}</TableSubtext>
                      )}
                    </TablePrimaryCell>
                  </TableTd>
                  <TableTd>
                    <TableBadge variant={actionBadgeVariant(log.action)}>
                      {actionCategory(log.action)}
                    </TableBadge>
                  </TableTd>
                  <TableTd>{log.action}</TableTd>
                  <TableTd>
                    <TableBadge variant="default">{tableLabel(log.tableName)}</TableBadge>
                  </TableTd>
                  <TableTd align="right" muted>
                    {log.recordId != null ? log.recordId : '—'}
                  </TableTd>
                  <TableActions>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setDetail(log)}
                    >
                      Detail
                    </Button>
                  </TableActions>
                </TableRow>
              ))
            )}
          </TableBody>
        </DataTable>
      </Panel>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail Audit Log"
        subtitle={detail ? `#${detail.id}` : undefined}
        size="sm"
      >
        {detail && (
          <div className="pos-detail-info">
            <div>
              <span>Waktu</span>
              <strong>{formatDateTime(detail.createdAt)}</strong>
            </div>
            <div>
              <span>Pengguna</span>
              <strong>
                {detail.userFullName || 'Sistem'}
                {detail.username ? ` (@${detail.username})` : ''}
              </strong>
            </div>
            <div>
              <span>Jenis Aksi</span>
              <strong>
                <TableBadge variant={actionBadgeVariant(detail.action)}>
                  {actionCategory(detail.action)}
                </TableBadge>
              </strong>
            </div>
            <div>
              <span>Aksi</span>
              <strong>{detail.action}</strong>
            </div>
            <div>
              <span>Modul / Tabel</span>
              <strong>{tableLabel(detail.tableName)}</strong>
            </div>
            <div>
              <span>Record ID</span>
              <strong>{detail.recordId != null ? detail.recordId : '—'}</strong>
            </div>
            <div>
              <span>User ID</span>
              <strong>{detail.userId != null ? detail.userId : '—'}</strong>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}
