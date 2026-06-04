import { useCallback, useEffect, useState } from 'react'
import { cashBankApi } from '../../api/cashBank'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
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
            <div className="pos-table-wrap">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Akun</th>
                    <th>Tipe</th>
                    <th>Bank / No. Rek</th>
                    <th>Outlet</th>
                    <th>Saldo Awal</th>
                    <th>Saldo Saat Ini</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!accountList?.accounts?.length ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: '#888' }}>
                        Belum ada akun kas & bank
                      </td>
                    </tr>
                  ) : (
                    accountList.accounts.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="pos-ref-link">{a.accountCode}</span>
                          {a.isDefault && (
                            <span className="ui-badge ui-badge-success" style={{ marginLeft: '0.35rem' }}>
                              Default
                            </span>
                          )}
                        </td>
                        <td>{a.accountName}</td>
                        <td>{typeLabel(a.accountType)}</td>
                        <td>
                          {a.accountType === 'Bank'
                            ? `${a.bankName || '—'}${a.accountNumber ? ` · ${a.accountNumber}` : ''}`
                            : '—'}
                        </td>
                        <td>{a.outletName || '—'}</td>
                        <td>{formatRupiah(a.openingBalance)}</td>
                        <td><strong>{formatRupiah(a.currentBalance)}</strong></td>
                        <td>
                          <span className={a.isActive ? 'ui-badge ui-badge-success' : 'ui-badge ui-badge-muted'}>
                            {a.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
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
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
            <div className="pos-table-wrap">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Akun</th>
                    <th>Tipe</th>
                    <th>Nominal</th>
                    <th>Referensi</th>
                    <th>Keterangan</th>
                    <th>Kasir</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!txList?.transactions?.length ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: '#888' }}>
                        Belum ada transaksi kas
                      </td>
                    </tr>
                  ) : (
                    txList.transactions.map((t) => (
                      <tr key={t.id}>
                        <td>{formatDateTime(t.transactionDate)}</td>
                        <td>
                          <span className="pos-ref-link">{t.accountCode}</span>
                          <span style={{ color: '#888', fontSize: '0.85rem', display: 'block' }}>
                            {t.accountName}
                          </span>
                        </td>
                        <td>
                          <span className={t.transactionType === 'IN' ? 'ui-badge ui-badge-success' : 'ui-badge ui-badge-danger'}>
                            {txLabel(t.transactionType)}
                          </span>
                        </td>
                        <td>{formatRupiah(t.amount)}</td>
                        <td>{t.referenceNumber || '—'}</td>
                        <td>{t.description || '—'}</td>
                        <td>{t.userFullName || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
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
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
