import { useCallback, useEffect, useRef, useState } from 'react'
import { backupsApi } from '../../api/backups'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import Modal from '../../components/ui/Modal'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import {
  DataTable,
  TableActions,
  TableBody,
  TableEmpty,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '../../components/ui/Table'
import { formatDateTime, formatFileSize } from '../../utils/format'

const BACKUP_TYPES = [
  { value: 'Manual', label: 'Manual' },
  { value: 'Scheduled', label: 'Terjadwal' },
  { value: 'Auto', label: 'Otomatis' },
]

const TYPE_LABELS = Object.fromEntries(BACKUP_TYPES.map((t) => [t.value, t.label]))

const STATUS_BADGE = {
  Completed: 'ui-badge-cash',
  Failed: 'ui-badge-danger',
  InProgress: 'ui-badge-transfer',
  Restored: 'ui-badge-transfer',
}

const STATUS_LABELS = {
  Completed: 'Selesai',
  Failed: 'Gagal',
  InProgress: 'Proses',
  Restored: 'Dipulihkan',
}

export default function BackupRestoreSetting() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [listData, setListData] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [backupNotes, setBackupNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  const [restoreFile, setRestoreFile] = useState(null)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoring, setRestoring] = useState(false)

  const fileInputRef = useRef(null)

  const loadList = useCallback(async () => {
    const params = { search: search || undefined }
    if (typeFilter) params.backupType = typeFilter
    if (statusFilter) params.status = statusFilter
    const data = await backupsApi.list(params)
    setListData(data)
  }, [search, typeFilter, statusFilter])

  useEffect(() => {
    loadList()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [loadList])

  const handleCreateBackup = async () => {
    setCreating(true)
    setError('')
    try {
      const result = await backupsApi.create({
        backupType: 'Manual',
        notes: backupNotes.trim() || null,
      })
      setSuccess(`Backup "${result.fileName}" berhasil dibuat (${formatFileSize(result.fileSizeBytes)}).`)
      setBackupNotes('')
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (id, fileName) => {
    setDownloadingId(id)
    setError('')
    try {
      await backupsApi.download(id, fileName)
      setSuccess(`File "${fileName}" berhasil diunduh.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (id, fileName) => {
    if (!window.confirm(`Hapus backup "${fileName}"? File tidak dapat dikembalikan.`)) return

    setDeletingId(id)
    setError('')
    try {
      await backupsApi.remove(id)
      setSuccess(`Backup "${fileName}" berhasil dihapus.`)
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const openRestoreFromHistory = (item) => {
    setRestoreTarget({ type: 'history', item })
  }

  const openRestoreFromUpload = () => {
    if (!restoreFile) {
      setError('Pilih file backup (.json) terlebih dahulu.')
      return
    }
    setRestoreTarget({ type: 'upload', file: restoreFile })
  }

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return

    setRestoring(true)
    setError('')
    try {
      let result
      if (restoreTarget.type === 'history') {
        result = await backupsApi.restoreFromId(restoreTarget.item.id)
      } else {
        result = await backupsApi.restoreFromFile(restoreTarget.file)
      }
      setSuccess(result.message || 'Database berhasil dipulihkan.')
      setRestoreTarget(null)
      setRestoreFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setRestoring(false)
    }
  }

  const restoreModalTitle = restoreTarget?.type === 'history'
    ? 'Pulihkan dari Riwayat Backup'
    : 'Pulihkan dari File'

  const restoreModalSubtitle = restoreTarget?.type === 'history'
    ? restoreTarget.item?.fileName
    : restoreTarget?.file?.name

  return (
    <PageShell
      title="Backup & Restore"
      description="DatabaseBackups — cadangkan dan pulihkan data POS LatihanASP"
      actions={(
        <Button variant="primary" type="button" disabled={creating} onClick={handleCreateBackup}>
          {creating ? 'Membuat Backup...' : '+ Backup Baru'}
        </Button>
      )}
      loading={loading}
      loadingMessage="Memuat riwayat backup..."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && <div className="ui-alert ui-alert-error">{error}</div>}

      {listData && (
        <div className="pos-stat-row">
          <StatCard label="Total Backup" value={listData.totalCount} />
          <StatCard label="Total Ukuran" value={formatFileSize(listData.totalSizeBytes)} />
          <StatCard
            label="Backup Terakhir"
            value={listData.lastBackupAt ? formatDateTime(listData.lastBackupAt) : '—'}
          />
        </div>
      )}

      <Panel title="Backup Database">
          <p className="pos-form-hint">
            Buat snapshot JSON dari seluruh tabel POS (kecuali riwayat backup).
            File disimpan di server dan tercatat di tabel DatabaseBackups.
          </p>
          <FormField label="Catatan (opsional)">
            <input
              type="text"
              placeholder="Contoh: Sebelum update stok bulanan"
              value={backupNotes}
              onChange={(e) => setBackupNotes(e.target.value)}
              maxLength={500}
            />
          </FormField>
          <div className="ui-actions-row">
            <Button variant="primary" type="button" disabled={creating} onClick={handleCreateBackup}>
              {creating ? 'Memproses...' : 'Buat Backup Sekarang'}
            </Button>
          </div>
        </Panel>

        <Panel title="Restore Database">
          <p className="pos-form-hint">
            Unggah file backup .json untuk memulihkan data. Operasi ini akan
            menimpa seluruh data POS saat ini. Pastikan Anda sudah membuat backup terbaru.
          </p>
          <FormField label="File Backup (.json)">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
            />
          </FormField>
          <div className="ui-actions-row">
            <Button
              variant="danger"
              type="button"
              disabled={!restoreFile || restoring}
              onClick={openRestoreFromUpload}
            >
              Restore dari File
            </Button>
          </div>
        </Panel>

      <Panel className="pos-product-filters">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadList().catch((err) => setError(err.message))
          }}
          className="pos-refund-list-filter"
        >
          <FormField label="Cari">
            <input
              type="text"
              placeholder="Nama file, catatan, user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormField>
          <FormField label="Tipe">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Semua</option>
              {BACKUP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Status">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua</option>
              <option value="Completed">Selesai</option>
              <option value="Restored">Dipulihkan</option>
              <option value="Failed">Gagal</option>
              <option value="InProgress">Proses</option>
            </select>
          </FormField>
          <Button variant="primary" type="submit">Cari</Button>
        </form>
      </Panel>

      <Panel title="Riwayat Backup">
        <DataTable>
          <TableHead>
            <TableRow>
              <TableTh>ID</TableTh>
              <TableTh>Nama File</TableTh>
              <TableTh>Tipe</TableTh>
              <TableTh>Ukuran</TableTh>
              <TableTh>Dibuat</TableTh>
              <TableTh>Oleh</TableTh>
              <TableTh>Status</TableTh>
              <TableTh align="actions" />
            </TableRow>
          </TableHead>
          <TableBody>
            {!listData?.backups?.length ? (
              <TableEmpty colSpan={8}>Belum ada backup tersimpan</TableEmpty>
            ) : (
              listData.backups.map((item) => (
                <TableRow key={item.id}>
                  <TableTd>{item.id}</TableTd>
                  <TableTd emphasize>{item.fileName}</TableTd>
                  <TableTd>{TYPE_LABELS[item.backupType] || item.backupType}</TableTd>
                  <TableTd>{formatFileSize(item.fileSizeBytes)}</TableTd>
                  <TableTd>{formatDateTime(item.createdAt)}</TableTd>
                  <TableTd muted>{item.createdByUserName || 'Sistem'}</TableTd>
                  <TableTd>
                    <span className={`ui-badge ${STATUS_BADGE[item.status] || 'ui-badge-transfer'}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </TableTd>
                  <TableActions>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={downloadingId === item.id}
                      onClick={() => handleDownload(item.id, item.fileName)}
                    >
                      {downloadingId === item.id ? '...' : 'Unduh'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={item.status === 'Failed' || restoring}
                      onClick={() => openRestoreFromHistory(item)}
                    >
                      Restore
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id, item.fileName)}
                    >
                      {deletingId === item.id ? '...' : 'Hapus'}
                    </Button>
                  </TableActions>
                </TableRow>
              ))
            )}
          </TableBody>
        </DataTable>
      </Panel>

      <Modal
        open={Boolean(restoreTarget)}
        onClose={() => !restoring && setRestoreTarget(null)}
        title={restoreModalTitle}
        subtitle={restoreModalSubtitle}
        size="sm"
      >
        <p>
          <strong>Peringatan:</strong> Restore akan menghapus data POS saat ini dan
          menggantinya dengan isi backup. Proses ini tidak dapat dibatalkan.
        </p>
        <p className="pos-form-hint">
          Disarankan membuat backup terbaru sebelum melanjutkan.
        </p>
        <div className="ui-actions-row">
            <Button
              variant="secondary"
              type="button"
              disabled={restoring}
              onClick={() => setRestoreTarget(null)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={restoring}
              onClick={handleConfirmRestore}
            >
              {restoring ? 'Memulihkan...' : 'Ya, Pulihkan Database'}
          </Button>
        </div>
      </Modal>
    </PageShell>
  )
}
