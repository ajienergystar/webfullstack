import { useCallback, useEffect, useState } from 'react'
import { offlineModeApi } from '../../api/offlineMode'
import { outletsApi } from '../../api/outlets'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
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
  TableRow,
  TableSubtext,
  TableTd,
  TableTh,
} from '../../components/ui/Table'
import { formatDateTime, formatRupiah } from '../../utils/format'

const SYNC_STATUS_BADGE = {
  Success: 'success',
  Failed: 'danger',
  Pending: 'warning',
  Never: 'muted',
}

const SYNC_STATUS_LABELS = {
  Success: 'Berhasil',
  Failed: 'Gagal',
  Pending: 'Menunggu',
  Never: 'Belum pernah',
}

const QUEUE_STATUS_BADGE = {
  Pending: 'warning',
  Syncing: 'info',
  Synced: 'success',
  Failed: 'danger',
}

const QUEUE_STATUS_LABELS = {
  Pending: 'Menunggu',
  Syncing: 'Sedang sync',
  Synced: 'Tersinkron',
  Failed: 'Gagal',
}

const RECORD_TYPE_LABELS = {
  Sale: 'Penjualan',
  Refund: 'Refund',
  Hold: 'Hold',
  StockAdjustment: 'Penyesuaian Stok',
}

const SYNC_TYPE_LABELS = {
  FullDownload: 'Unduh Master Data',
  IncrementalDownload: 'Update Incremental',
  UploadQueue: 'Upload Antrian',
  AutoSync: 'Sinkronisasi Otomatis',
}

const LOG_STATUS_BADGE = {
  Success: 'success',
  Failed: 'danger',
  Partial: 'warning',
}

function ConnectionBanner({ isOnline }) {
  return (
    <div className={`offline-connection-banner ${isOnline ? 'is-online' : 'is-offline'}`}>
      <span className="offline-connection-dot" aria-hidden="true" />
      <div>
        <strong>{isOnline ? 'Terhubung ke Server' : 'Tidak Terhubung ke Server'}</strong>
        <p>
          {isOnline
            ? 'API backend dapat diakses. Data antrian offline siap diunggah.'
            : 'Browser dalam mode offline. Transaksi tetap tersimpan lokal dan akan disinkronkan saat koneksi kembali.'}
        </p>
      </div>
    </div>
  )
}

export default function OfflineMode() {
  const [listData, setListData] = useState(null)
  const [outlets, setOutlets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionId, setActionId] = useState(null)
  const [browserOnline, setBrowserOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  const [filters, setFilters] = useState({
    search: '',
    outletId: '',
    syncStatus: '',
    queueStatus: '',
  })

  const loadList = useCallback(async (f) => {
    setLoading(true)
    setError('')
    try {
      const data = await offlineModeApi.list({
        search: f.search || undefined,
        outletId: f.outletId || undefined,
        syncStatus: f.syncStatus || undefined,
        queueStatus: f.queueStatus || undefined,
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
    outletsApi.list({})
      .then((data) => setOutlets(data.outlets || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadList(filters)
  }, [loadList])

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true)
    const handleOffline = () => setBrowserOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    loadList(filters)
  }

  const handleFilterReset = () => {
    const reset = { search: '', outletId: '', syncStatus: '', queueStatus: '' }
    setFilters(reset)
    loadList(reset)
  }

  const handleToggleOffline = async (device) => {
    setActionId(`toggle-${device.id}`)
    setError('')
    try {
      await offlineModeApi.updateDevice(device.id, {
        isOfflineEnabled: !device.isOfflineEnabled,
      })
      setSuccess(
        device.isOfflineEnabled
          ? `Mode offline dinonaktifkan untuk ${device.deviceName}.`
          : `Mode offline diaktifkan untuk ${device.deviceName}.`,
      )
      await loadList(filters)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId(null)
    }
  }

  const handleSyncDevice = async (device, syncType) => {
    setActionId(`sync-${device.id}-${syncType}`)
    setError('')
    try {
      const result = await offlineModeApi.syncDevice(device.id, syncType)
      setSuccess(result.message || `Sinkronisasi ${device.deviceName} selesai.`)
      await loadList(filters)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId(null)
    }
  }

  const handleRetryQueue = async (item) => {
    setActionId(`retry-${item.id}`)
    setError('')
    try {
      await offlineModeApi.retryQueue(item.id)
      setSuccess(`Antrian ${item.queueNumber} dikembalikan ke status menunggu.`)
      await loadList(filters)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId(null)
    }
  }

  const pageActions = (
    <>
      <Button
        variant="secondary"
        type="button"
        onClick={() => loadList(filters)}
        disabled={loading}
      >
        Muat Ulang
      </Button>
      {listData?.devices?.some((d) => d.pendingSyncCount > 0) && (
        <Button
          variant="primary"
          type="button"
          disabled={!!actionId}
          onClick={async () => {
            const device = listData.devices.find((d) => d.pendingSyncCount > 0)
            if (device) await handleSyncDevice(device, 'UploadQueue')
          }}
        >
          Upload Antrian
        </Button>
      )}
    </>
  )

  return (
    <PageShell
      title="Offline Mode"
      description="OfflineDevices, OfflineSyncQueue & OfflineSyncLogs — kelola perangkat kasir, cache master data, dan antrian transaksi offline"
      actions={pageActions}
      loading={loading && !listData}
      loadingMessage="Memuat data offline mode..."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && <div className="ui-alert ui-alert-error">{error}</div>}

      <ConnectionBanner isOnline={browserOnline} />

      {listData && (
        <div className="pos-stat-row">
          <StatCard label="Total Perangkat" value={listData.totalDevices} />
          <StatCard label="Mode Offline Aktif" value={listData.enabledDevices} />
          <StatCard label="Antrian Menunggu" value={listData.pendingQueueCount} />
          <StatCard label="Sinkronisasi Gagal" value={listData.failedQueueCount} />
          <StatCard label="Master Data Tersedia" value={listData.masterDataCount} />
        </div>
      )}

      <Panel className="pos-product-filters">
        <form onSubmit={handleFilterSubmit} className="pos-refund-list-filter">
          <FormField label="Cari">
            <input
              type="text"
              placeholder="Kode perangkat, nama, antrian..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </FormField>
          <FormField label="Outlet">
            <select value={filters.outletId} onChange={(e) => handleFilterChange('outletId', e.target.value)}>
              <option value="">Semua</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.outletName}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Status Sync Perangkat">
            <select value={filters.syncStatus} onChange={(e) => handleFilterChange('syncStatus', e.target.value)}>
              <option value="">Semua</option>
              {Object.entries(SYNC_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Status Antrian">
            <select value={filters.queueStatus} onChange={(e) => handleFilterChange('queueStatus', e.target.value)}>
              <option value="">Semua</option>
              {Object.entries(QUEUE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>
          <Button variant="primary" type="submit">Cari</Button>
          <Button variant="secondary" type="button" onClick={handleFilterReset}>Reset</Button>
        </form>
      </Panel>

      <Panel title="Perangkat Kasir">
        <DataTable>
          <TableHead>
            <TableRow>
              <TableTh>Perangkat</TableTh>
              <TableTh>Outlet</TableTh>
              <TableTh>Kasir</TableTh>
              <TableTh>Status</TableTh>
              <TableTh>Cache Master Data</TableTh>
              <TableTh>Sync Terakhir</TableTh>
              <TableTh align="right">Antrian</TableTh>
              <TableTh align="actions" aria-label="Aksi" />
            </TableRow>
          </TableHead>
          <TableBody>
            {!listData?.devices?.length ? (
              <TableEmpty colSpan={8}>Tidak ada perangkat terdaftar</TableEmpty>
            ) : (
              listData.devices.map((device) => {
                const isBusy = actionId?.startsWith(`toggle-${device.id}`) || actionId?.startsWith(`sync-${device.id}`)
                return (
                  <TableRow key={device.id}>
                    <TableTd>
                      <strong>{device.deviceName}</strong>
                      <TableSubtext>{device.deviceCode}</TableSubtext>
                      {device.notes && <TableSubtext>{device.notes}</TableSubtext>}
                    </TableTd>
                    <TableTd>{device.outletName}</TableTd>
                    <TableTd>{device.assignedUserName || '—'}</TableTd>
                    <TableTd>
                      <TableBadge variant={device.isOnline ? 'success' : 'danger'}>
                        {device.isOnline ? 'Online' : 'Offline'}
                      </TableBadge>
                      <div style={{ marginTop: '0.35rem' }}>
                        <TableBadge variant={device.isOfflineEnabled ? 'info' : 'muted'}>
                          {device.isOfflineEnabled ? 'Mode Offline Aktif' : 'Mode Offline Nonaktif'}
                        </TableBadge>
                      </div>
                    </TableTd>
                    <TableTd>
                      {device.cachedProductsAt ? (
                        <>
                          <TableSubtext>Produk: {formatDateTime(device.cachedProductsAt)}</TableSubtext>
                          {device.cachedCustomersAt && (
                            <TableSubtext>Pelanggan: {formatDateTime(device.cachedCustomersAt)}</TableSubtext>
                          )}
                        </>
                      ) : (
                        <span className="ui-table-cell-muted">Belum diunduh</span>
                      )}
                    </TableTd>
                    <TableTd>
                      {device.lastSyncAt ? (
                        <>
                          {formatDateTime(device.lastSyncAt)}
                          <div style={{ marginTop: '0.35rem' }}>
                            <TableBadge variant={SYNC_STATUS_BADGE[device.lastSyncStatus] || 'muted'}>
                              {SYNC_STATUS_LABELS[device.lastSyncStatus] || device.lastSyncStatus}
                            </TableBadge>
                          </div>
                        </>
                      ) : (
                        <span className="ui-table-cell-muted">Belum pernah</span>
                      )}
                    </TableTd>
                    <TableTd align="right" emphasize>
                      {device.pendingSyncCount}
                    </TableTd>
                    <TableActions>
                      <Button
                        variant={device.isOfflineEnabled ? 'danger' : 'success'}
                        size="sm"
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleOffline(device)}
                      >
                        {isBusy ? '...' : device.isOfflineEnabled ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSyncDevice(device, 'FullDownload')}
                      >
                        {isBusy ? '...' : 'Unduh Data'}
                      </Button>
                      {device.pendingSyncCount > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSyncDevice(device, 'UploadQueue')}
                        >
                          {isBusy ? '...' : 'Upload'}
                        </Button>
                      )}
                    </TableActions>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </DataTable>
      </Panel>

      <Panel title="Antrian Sinkronisasi">
        <DataTable>
          <TableHead>
            <TableRow>
              <TableTh>No. Antrian</TableTh>
              <TableTh>Perangkat</TableTh>
              <TableTh>Tipe</TableTh>
              <TableTh>Referensi</TableTh>
              <TableTh>Tanggal Lokal</TableTh>
              <TableTh align="right">Total</TableTh>
              <TableTh>Status</TableTh>
              <TableTh align="actions" aria-label="Aksi" />
            </TableRow>
          </TableHead>
          <TableBody>
            {!listData?.queue?.length ? (
              <TableEmpty colSpan={8}>Tidak ada antrian untuk filter ini</TableEmpty>
            ) : (
              listData.queue.map((item) => {
                const isBusy = actionId === `retry-${item.id}`
                return (
                  <TableRow key={item.id}>
                    <TableTd>{item.queueNumber}</TableTd>
                    <TableTd>{item.deviceName}</TableTd>
                    <TableTd>{RECORD_TYPE_LABELS[item.recordType] || item.recordType}</TableTd>
                    <TableTd>
                      {item.referenceLabel || '—'}
                      {item.errorMessage && <TableSubtext>{item.errorMessage}</TableSubtext>}
                    </TableTd>
                    <TableTd>{formatDateTime(item.localCreatedAt)}</TableTd>
                    <TableTd align="right" emphasize>
                      {item.grandTotal != null ? formatRupiah(item.grandTotal) : '—'}
                    </TableTd>
                    <TableTd>
                      <TableBadge variant={QUEUE_STATUS_BADGE[item.syncStatus] || 'muted'}>
                        {QUEUE_STATUS_LABELS[item.syncStatus] || item.syncStatus}
                      </TableBadge>
                      {item.retryCount > 0 && (
                        <TableSubtext>Percobaan: {item.retryCount}x</TableSubtext>
                      )}
                    </TableTd>
                    <TableActions>
                      {item.syncStatus === 'Failed' && (
                        <Button
                          variant="primary"
                          size="sm"
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRetryQueue(item)}
                        >
                          {isBusy ? '...' : 'Coba Lagi'}
                        </Button>
                      )}
                    </TableActions>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </DataTable>
      </Panel>

      <Panel title="Riwayat Sinkronisasi">
        <DataTable>
          <TableHead>
            <TableRow>
              <TableTh>Waktu</TableTh>
              <TableTh>Perangkat</TableTh>
              <TableTh>Tipe</TableTh>
              <TableTh>Arah</TableTh>
              <TableTh align="right">Berhasil</TableTh>
              <TableTh align="right">Gagal</TableTh>
              <TableTh>Status</TableTh>
              <TableTh>Catatan</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {!listData?.logs?.length ? (
              <TableEmpty colSpan={8}>Belum ada riwayat sinkronisasi</TableEmpty>
            ) : (
              listData.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableTd>{formatDateTime(log.startedAt)}</TableTd>
                  <TableTd>{log.deviceName}</TableTd>
                  <TableTd>{SYNC_TYPE_LABELS[log.syncType] || log.syncType}</TableTd>
                  <TableTd>{log.direction === 'Download' ? 'Unduh' : 'Unggah'}</TableTd>
                  <TableTd align="right">{log.recordsProcessed}</TableTd>
                  <TableTd align="right">{log.recordsFailed}</TableTd>
                  <TableTd>
                    <TableBadge variant={LOG_STATUS_BADGE[log.status] || 'muted'}>
                      {log.status}
                    </TableBadge>
                  </TableTd>
                  <TableTd muted>{log.notes || '—'}</TableTd>
                </TableRow>
              ))
            )}
          </TableBody>
        </DataTable>
      </Panel>
    </PageShell>
  )
}
