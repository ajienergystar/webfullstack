import { useCallback, useEffect, useState } from 'react'
import { cashBankApi } from '../../api/cashBank'
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
  TableLink,
  TablePrimaryCell,
  TableRow,
  TableSubtext,
  TableTd,
  TableTh,
  badgeVariantActive,
  badgeVariantInOut,
} from '../../components/ui/Table'
import { formatDateTime, formatRupiah } from '../../utils/format'

const ACCOUNT_TYPES = [
  { value: 'Cash', label: 'Kas (Tunai)' },
  { value: 'Bank', label: 'Bank' },
]

const TX_TYPES = [
  { value: 'IN', label: 'Kas Masuk' },
  { value: 'OUT', label: 'Kas Keluar' },
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function nowDatetimeLocal() {
  return toDatetimeLocalValue(new Date().toISOString())
}

function fromDatetimeLocalValue(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

const emptyAccountForm = {
  accountCode: '',
  accountName: '',
  accountNumber: '',
  accountType: 'Cash',
  bankName: '',
  openingBalance: '',
  outletId: '',
  isDefault: false,
  isActive: true,
  notes: '',
}

const emptyTxForm = {
  cashAccountId: '',
  transactionType: 'IN',
  amount: '',
  transactionDate: nowDatetimeLocal(),
  referenceNumber: '',
  description: '',
  userId: '',
  outletId: '',
}

function typeLabel(type) {
  return type === 'Bank' ? 'Bank' : 'Kas'
}

function txLabel(type) {
  return type === 'IN' ? 'Masuk' : 'Keluar'
}

export default function KasBank() {
  const [view, setView] = useState('list')
  const [formData, setFormData] = useState(null)
  const [accountList, setAccountList] = useState(null)
  const [txList, setTxList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [accountSearch, setAccountSearch] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState('')
  const [txAccountFilter, setTxAccountFilter] = useState('')

  const [editingAccountId, setEditingAccountId] = useState(null)
  const [editingTxId, setEditingTxId] = useState(null)
  const [accountForm, setAccountForm] = useState(emptyAccountForm)
  const [txForm, setTxForm] = useState(emptyTxForm)
  const [deletingAccountId, setDeletingAccountId] = useState(null)
  const [deletingTxId, setDeletingTxId] = useState(null)

  const loadAccounts = useCallback(async () => {
    const data = await cashBankApi.listAccounts({
      search: accountSearch || undefined,
      accountType: accountTypeFilter || undefined,
    })
    setAccountList(data)
  }, [accountSearch, accountTypeFilter])

  const loadTransactions = useCallback(async () => {
    const data = await cashBankApi.listTransactions({
      accountId: txAccountFilter || undefined,
      transactionType: txTypeFilter || undefined,
    })
    setTxList(data)
  }, [txAccountFilter, txTypeFilter])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [meta, accounts, transactions] = await Promise.all([
        cashBankApi.getFormData(),
        cashBankApi.listAccounts(),
        cashBankApi.listTransactions(),
      ])
      setFormData(meta)
      setAccountList(accounts)
      setTxList(transactions)
    } catch (err) {
      setError(err.message)
      setFormData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  useEffect(() => {
    if (!loading && formData) {
      loadAccounts().catch((err) => setError(err.message))
    }
  }, [loading, formData, loadAccounts])

  useEffect(() => {
    if (!loading && formData) {
      loadTransactions().catch((err) => setError(err.message))
    }
  }, [loading, formData, loadTransactions])

  const updateAccountField = (field, value) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateTxField = (field, value) => {
    setTxForm((prev) => ({ ...prev, [field]: value }))
  }

  const openCreateAccount = () => {
    setEditingAccountId(null)
    setAccountForm({
      ...emptyAccountForm,
      outletId: formData?.outlets?.length ? String(formData.outlets[0].id) : '',
    })
    setView('account-form')
    setError('')
    setSuccess('')
  }

  const openEditAccount = async (id) => {
    setError('')
    try {
      const record = await cashBankApi.getAccount(id)
      setEditingAccountId(id)
      setAccountForm({
        accountCode: record.accountCode || '',
        accountName: record.accountName || '',
        accountNumber: record.accountNumber || '',
        accountType: record.accountType || 'Cash',
        bankName: record.bankName || '',
        openingBalance: String(record.openingBalance ?? ''),
        outletId: record.outletId ? String(record.outletId) : '',
        isDefault: record.isDefault,
        isActive: record.isActive,
        notes: record.notes || '',
      })
      setView('account-form')
    } catch (err) {
      setError(err.message)
    }
  }

  const openCreateTx = () => {
    setEditingTxId(null)
    const firstAccount = formData?.accounts?.[0]
    setTxForm({
      ...emptyTxForm,
      transactionDate: nowDatetimeLocal(),
      cashAccountId: firstAccount ? String(firstAccount.id) : '',
      userId: formData?.users?.length ? String(formData.users[0].id) : '',
      outletId: formData?.outlets?.length ? String(formData.outlets[0].id) : '',
    })
    setView('tx-form')
    setError('')
    setSuccess('')
  }

  const openEditTx = async (id) => {
    setError('')
    try {
      const record = await cashBankApi.getTransaction(id)
      setEditingTxId(id)
      setTxForm({
        cashAccountId: String(record.cashAccountId),
        transactionType: record.transactionType || 'IN',
        amount: String(record.amount ?? ''),
        transactionDate: toDatetimeLocalValue(record.transactionDate),
        referenceNumber: record.referenceNumber || '',
        description: record.description || '',
        userId: record.userId ? String(record.userId) : '',
        outletId: record.outletId ? String(record.outletId) : '',
      })
      setView('tx-form')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmitAccount = async (e) => {
    e.preventDefault()
    if (!accountForm.accountCode.trim()) {
      setError('Kode akun wajib diisi.')
      return
    }
    if (!accountForm.accountName.trim()) {
      setError('Nama akun wajib diisi.')
      return
    }
    if (accountForm.accountType === 'Bank' && !accountForm.bankName.trim()) {
      setError('Nama bank wajib diisi untuk tipe Bank.')
      return
    }
    const openingBalance = Number(accountForm.openingBalance)
    if (Number.isNaN(openingBalance) || openingBalance < 0) {
      setError('Saldo awal tidak valid.')
      return
    }

    const payload = {
      accountCode: accountForm.accountCode.trim().toUpperCase(),
      accountName: accountForm.accountName.trim(),
      accountNumber: accountForm.accountNumber.trim() || null,
      accountType: accountForm.accountType,
      bankName: accountForm.accountType === 'Bank' ? accountForm.bankName.trim() : null,
      openingBalance,
      outletId: accountForm.outletId ? Number(accountForm.outletId) : null,
      isDefault: accountForm.isDefault,
      isActive: accountForm.isActive,
      notes: accountForm.notes.trim() || null,
    }

    setSubmitting(true)
    setError('')
    try {
      const result = editingAccountId
        ? await cashBankApi.updateAccount(editingAccountId, payload)
        : await cashBankApi.createAccount(payload)
      setSuccess(
        editingAccountId
          ? `Akun "${result.accountCode}" berhasil diperbarui.`
          : `Akun baru "${result.accountCode}" berhasil ditambahkan.`,
      )
      setFormData(await cashBankApi.getFormData())
      await loadAccounts()
      setView('list')
      setEditingAccountId(null)
      setAccountForm(emptyAccountForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitTx = async (e) => {
    e.preventDefault()
    if (!txForm.cashAccountId) {
      setError('Akun kas/bank wajib dipilih.')
      return
    }
    const amount = Number(txForm.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Nominal harus lebih dari 0.')
      return
    }
    if (!txForm.transactionDate) {
      setError('Tanggal transaksi wajib diisi.')
      return
    }

    const payload = {
      cashAccountId: Number(txForm.cashAccountId),
      transactionType: txForm.transactionType,
      amount,
      transactionDate: fromDatetimeLocalValue(txForm.transactionDate),
      referenceNumber: txForm.referenceNumber.trim() || null,
      description: txForm.description.trim() || null,
      userId: txForm.userId ? Number(txForm.userId) : null,
      outletId: txForm.outletId ? Number(txForm.outletId) : null,
    }

    setSubmitting(true)
    setError('')
    try {
      const result = editingTxId
        ? await cashBankApi.updateTransaction(editingTxId, payload)
        : await cashBankApi.createTransaction(payload)
      setSuccess(
        editingTxId
          ? `Transaksi #${result.id} berhasil diperbarui.`
          : `Transaksi kas ${txLabel(txForm.transactionType)} berhasil dicatat.`,
      )
      setFormData(await cashBankApi.getFormData())
      await Promise.all([loadAccounts(), loadTransactions()])
      setView('list')
      setEditingTxId(null)
      setTxForm(emptyTxForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAccount = async (id, code) => {
    if (!window.confirm(`Hapus akun "${code}"?`)) return
    setDeletingAccountId(id)
    setError('')
    try {
      await cashBankApi.deleteAccount(id)
      setSuccess(`Akun "${code}" berhasil dihapus.`)
      setFormData(await cashBankApi.getFormData())
      await loadAccounts()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingAccountId(null)
    }
  }

  const handleDeleteTx = async (id) => {
    if (!window.confirm('Hapus transaksi ini? Saldo akun akan disesuaikan.')) return
    setDeletingTxId(id)
    setError('')
    try {
      await cashBankApi.deleteTransaction(id)
      setSuccess('Transaksi berhasil dihapus.')
      setFormData(await cashBankApi.getFormData())
      await Promise.all([loadAccounts(), loadTransactions()])
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingTxId(null)
    }
  }

  const listActions = view === 'list' ? (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Button variant="secondary" type="button" onClick={openCreateTx}>
        + Kas Masuk/Keluar
      </Button>
      <Button variant="primary" type="button" onClick={openCreateAccount}>
        + Akun Baru
      </Button>
    </div>
  ) : (
    <Button
      variant="secondary"
      type="button"
      onClick={() => {
        setView('list')
        setEditingAccountId(null)
        setEditingTxId(null)
        setError('')
      }}
    >
      ← Kembali
    </Button>
  )

  return (
    <PageShell
      title="Kas & Bank"
      description="Kelola akun kas/bank (CashAccounts) dan transaksi kas masuk/keluar (CashTransactions)"
      actions={listActions}
      loading={loading}
      loadingMessage="Memuat data kas & bank..."
      error={!formData ? error : undefined}
      errorHint="Pastikan database POS sudah diinisialisasi dan migrasi cash-bank-tables.sql dijalankan."
      success={success}
      onDismissSuccess={() => setSuccess('')}
    >
      {error && formData && <div className="ui-alert ui-alert-error">{error}</div>}

      {formData && view === 'list' && (
        <>
          {accountList && (
            <div className="pos-stat-row">
              <StatCard label="Total Akun" value={accountList.totalCount} />
              <StatCard label="Saldo Kas" value={formatRupiah(accountList.totalCashBalance)} />
              <StatCard label="Saldo Bank" value={formatRupiah(accountList.totalBankBalance)} />
            </div>
          )}

          <Panel title="Daftar Akun Kas & Bank">
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Cari akun">
                <input
                  type="text"
                  placeholder="Kode, nama, atau nomor rekening"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                />
              </FormField>
              <FormField label="Tipe">
                <select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                >
                  <option value="">Semua</option>
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>Kode</TableTh>
                  <TableTh>Nama Akun</TableTh>
                  <TableTh>Tipe</TableTh>
                  <TableTh>Bank / No. Rek</TableTh>
                  <TableTh>Outlet</TableTh>
                  <TableTh align="right">Saldo Awal</TableTh>
                  <TableTh align="right">Saldo Saat Ini</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!accountList?.accounts?.length ? (
                  <TableEmpty colSpan={9}>Belum ada akun kas & bank</TableEmpty>
                ) : (
                  accountList.accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableTd>
                        <TablePrimaryCell>
                          <TableLink>{a.accountCode}</TableLink>
                          {a.isDefault && <TableBadge variant="default">Default</TableBadge>}
                        </TablePrimaryCell>
                      </TableTd>
                      <TableTd>{a.accountName}</TableTd>
                      <TableTd>{typeLabel(a.accountType)}</TableTd>
                      <TableTd muted={a.accountType !== 'Bank'}>
                        {a.accountType === 'Bank'
                          ? `${a.bankName || '—'}${a.accountNumber ? ` · ${a.accountNumber}` : ''}`
                          : '—'}
                      </TableTd>
                      <TableTd muted={!a.outletName}>{a.outletName || '—'}</TableTd>
                      <TableTd align="right">{formatRupiah(a.openingBalance)}</TableTd>
                      <TableTd align="right" emphasize>{formatRupiah(a.currentBalance)}</TableTd>
                      <TableTd>
                        <TableBadge variant={badgeVariantActive(a.isActive)}>
                          {a.isActive ? 'Aktif' : 'Nonaktif'}
                        </TableBadge>
                      </TableTd>
                      <TableActions>
                        <Button variant="secondary" size="sm" type="button" onClick={() => openEditAccount(a.id)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={deletingAccountId === a.id}
                          onClick={() => handleDeleteAccount(a.id, a.accountCode)}
                        >
                          Hapus
                        </Button>
                      </TableActions>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </DataTable>
          </Panel>

          <Panel title="Transaksi Kas Masuk / Keluar" style={{ marginTop: '1rem' }}>
            <div className="ui-form-grid ui-form-grid-3" style={{ marginBottom: '1rem' }}>
              <FormField label="Filter akun">
                <select
                  value={txAccountFilter}
                  onChange={(e) => setTxAccountFilter(e.target.value)}
                >
                  <option value="">Semua akun</option>
                  {formData.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountCode} — {a.accountName}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tipe transaksi">
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value)}
                >
                  <option value="">Semua</option>
                  {TX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableTh>Tanggal</TableTh>
                  <TableTh>Akun</TableTh>
                  <TableTh>Tipe</TableTh>
                  <TableTh align="right">Nominal</TableTh>
                  <TableTh>Referensi</TableTh>
                  <TableTh>Keterangan</TableTh>
                  <TableTh>Kasir</TableTh>
                  <TableTh align="actions" aria-label="Aksi" />
                </TableRow>
              </TableHead>
              <TableBody>
                {!txList?.transactions?.length ? (
                  <TableEmpty colSpan={8}>Belum ada transaksi kas</TableEmpty>
                ) : (
                  txList.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableTd>{formatDateTime(t.transactionDate)}</TableTd>
                      <TableTd>
                        <TableLink>{t.accountCode}</TableLink>
                        <TableSubtext>{t.accountName}</TableSubtext>
                      </TableTd>
                      <TableTd>
                        <TableBadge variant={badgeVariantInOut(t.transactionType)}>
                          {txLabel(t.transactionType)}
                        </TableBadge>
                      </TableTd>
                      <TableTd align="right" emphasize>{formatRupiah(t.amount)}</TableTd>
                      <TableTd muted={!t.referenceNumber}>{t.referenceNumber || '—'}</TableTd>
                      <TableTd muted={!t.description}>{t.description || '—'}</TableTd>
                      <TableTd muted={!t.userFullName}>{t.userFullName || '—'}</TableTd>
                      <TableActions>
                        <Button variant="secondary" size="sm" type="button" onClick={() => openEditTx(t.id)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={deletingTxId === t.id}
                          onClick={() => handleDeleteTx(t.id)}
                        >
                          Hapus
                        </Button>
                      </TableActions>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </DataTable>
          </Panel>
        </>
      )}

      {formData && view === 'account-form' && (
        <form onSubmit={handleSubmitAccount}>
          <Panel title={editingAccountId ? 'Edit Akun Kas & Bank' : 'Tambah Akun Kas & Bank'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Kode Akun *">
                <input
                  type="text"
                  placeholder="Contoh: KAS-02"
                  value={accountForm.accountCode}
                  onChange={(e) => updateAccountField('accountCode', e.target.value.toUpperCase())}
                  required
                />
              </FormField>
              <FormField label="Nama Akun *">
                <input
                  type="text"
                  placeholder="Contoh: Kas Toko"
                  value={accountForm.accountName}
                  onChange={(e) => updateAccountField('accountName', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Tipe *">
                <select
                  value={accountForm.accountType}
                  onChange={(e) => updateAccountField('accountType', e.target.value)}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              {accountForm.accountType === 'Bank' && (
                <>
                  <FormField label="Nama Bank *">
                    <input
                      type="text"
                      placeholder="BCA, Mandiri, dll."
                      value={accountForm.bankName}
                      onChange={(e) => updateAccountField('bankName', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Nomor Rekening">
                    <input
                      type="text"
                      placeholder="Nomor rekening"
                      value={accountForm.accountNumber}
                      onChange={(e) => updateAccountField('accountNumber', e.target.value)}
                    />
                  </FormField>
                </>
              )}
              <FormField label="Saldo Awal *">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={accountForm.openingBalance}
                  onChange={(e) => updateAccountField('openingBalance', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Outlet">
                <select
                  value={accountForm.outletId}
                  onChange={(e) => updateAccountField('outletId', e.target.value)}
                >
                  <option value="">— Semua outlet —</option>
                  {formData.outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Akun Default">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={accountForm.isDefault}
                    onChange={(e) => updateAccountField('isDefault', e.target.checked)}
                  />
                  Jadikan akun default
                </label>
              </FormField>
              <FormField label="Status Aktif">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={accountForm.isActive}
                    onChange={(e) => updateAccountField('isActive', e.target.checked)}
                  />
                  Akun aktif
                </label>
              </FormField>
              <FormField label="Keterangan" className="ui-form-grid-span-3">
                <textarea
                  rows={3}
                  placeholder="Catatan tambahan"
                  value={accountForm.notes}
                  onChange={(e) => updateAccountField('notes', e.target.value)}
                />
              </FormField>
            </div>
            <div className="ui-actions-row">
              <Button variant="secondary" type="button" onClick={() => setView('list')}>
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingAccountId ? 'Simpan Perubahan' : 'Simpan Akun'}
              </Button>
            </div>
          </Panel>
        </form>
      )}

      {formData && view === 'tx-form' && (
        <form onSubmit={handleSubmitTx}>
          <Panel title={editingTxId ? 'Edit Transaksi Kas' : 'Catat Kas Masuk / Keluar'}>
            <div className="ui-form-grid ui-form-grid-3">
              <FormField label="Akun Kas/Bank *">
                <select
                  value={txForm.cashAccountId}
                  onChange={(e) => updateTxField('cashAccountId', e.target.value)}
                  required
                >
                  <option value="">— Pilih akun —</option>
                  {formData.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountCode} — {a.accountName} ({formatRupiah(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Tipe Transaksi *">
                <select
                  value={txForm.transactionType}
                  onChange={(e) => updateTxField('transactionType', e.target.value)}
                >
                  {TX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Nominal *">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={txForm.amount}
                  onChange={(e) => updateTxField('amount', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Tanggal & Waktu *">
                <input
                  type="datetime-local"
                  value={txForm.transactionDate}
                  onChange={(e) => updateTxField('transactionDate', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="No. Referensi">
                <input
                  type="text"
                  placeholder="KM-20260604-001"
                  value={txForm.referenceNumber}
                  onChange={(e) => updateTxField('referenceNumber', e.target.value)}
                />
              </FormField>
              <FormField label="Kasir / User">
                <select
                  value={txForm.userId}
                  onChange={(e) => updateTxField('userId', e.target.value)}
                >
                  <option value="">— Opsional —</option>
                  {formData.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Outlet">
                <select
                  value={txForm.outletId}
                  onChange={(e) => updateTxField('outletId', e.target.value)}
                >
                  <option value="">— Opsional —</option>
                  {formData.outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.outletName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Keterangan" className="ui-form-grid-span-3">
                <textarea
                  rows={3}
                  placeholder="Deskripsi transaksi"
                  value={txForm.description}
                  onChange={(e) => updateTxField('description', e.target.value)}
                />
              </FormField>
            </div>
            <div className="ui-actions-row">
              <Button variant="secondary" type="button" onClick={() => setView('list')}>
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingTxId ? 'Simpan Perubahan' : 'Simpan Transaksi'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </PageShell>
  )
}
