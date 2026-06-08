import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDateTime } from './format'
import {
  computeFinanceSummary,
  formatFinanceFilterSummary,
  formatReportDate,
  formatReportDateTime,
  formatSignedRupiah,
  incomeStatementRows,
} from './financeReport'
import { rupiahPlain } from './salesReport'

export function exportFinanceReportPdf({
  reportData,
  filters,
  formData,
  printedBy,
  companyName = 'ERP Point Of Sale',
}) {
  const {
    salesHistory,
    refunds,
    purchases,
    expenses,
    cashTransactions,
  } = reportData

  const summary = computeFinanceSummary({
    salesHistory,
    refunds,
    purchases,
    expenses,
    cashTransactions,
  })
  const plRows = incomeStatementRows(summary)
  const filterText = formatFinanceFilterSummary(filters, formData)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(companyName, pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(13)
  doc.text('LAPORAN KEUANGAN', pageWidth / 2, y, { align: 'center' })
  y += 5
  doc.setFontSize(10)
  doc.text('Laporan Laba Rugi & Arus Kas', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    `Periode: ${formatReportDate(filters.dateFrom)} — ${formatReportDate(filters.dateTo)}`,
    14,
    y,
  )
  y += 5
  doc.text(`Filter: ${filterText}`, 14, y)
  y += 5
  doc.text(`Dicetak: ${formatReportDateTime()} · Oleh: ${printedBy || '-'}`, 14, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('I. Laporan Laba Rugi', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    head: [['Pos', 'Jumlah (Rp)']],
    body: plRows.map((row) => [row.label, formatSignedRupiah(row.amount)]),
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 6

  doc.setFont('helvetica', 'bold')
  doc.text('II. Arus Kas (CashTransactions)', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    headStyles: { fillColor: [52, 152, 219], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    head: [['Keterangan', 'Jumlah']],
    body: [
      ['Kas Masuk (IN)', rupiahPlain(summary.cash.cashIn)],
      ['Kas Keluar (OUT)', rupiahPlain(summary.cash.cashOut)],
      ['Net Arus Kas', rupiahPlain(summary.cash.netFlow)],
      ['Jumlah Transaksi', String(summary.cash.count)],
    ],
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 6

  const salesTx = salesHistory?.transactions ?? []
  if (salesTx.length) {
    doc.setFont('helvetica', 'bold')
    doc.text('III. Ringkasan Penjualan', 14, y)
    y += 2
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      head: [['Invoice', 'Tanggal', 'Total', 'Pajak', 'Metode']],
      body: salesTx.slice(0, 40).map((tx) => [
        tx.invoiceNumber,
        formatDateTime(tx.transactionDate),
        rupiahPlain(tx.grandTotal),
        rupiahPlain(tx.tax),
        tx.paymentMethod || '-',
      ]),
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  const expenseList = expenses?.expenses ?? []
  if (expenseList.length) {
    doc.setFont('helvetica', 'bold')
    doc.text('IV. Rincian Pengeluaran', 14, y)
    y += 2
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [192, 57, 43], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Nama', 'Tanggal', 'Jumlah', 'Catatan']],
      body: expenseList.map((e) => [
        e.expenseName,
        formatDateTime(e.expenseDate),
        rupiahPlain(e.amount),
        (e.notes || '-').slice(0, 40),
      ]),
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  const purchaseList = purchases?.purchases ?? []
  if (purchaseList.length) {
    doc.setFont('helvetica', 'bold')
    doc.text('V. Rincian Pembelian', 14, y)
    y += 2
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [142, 68, 173], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Invoice', 'Supplier', 'Tanggal', 'Total']],
      body: purchaseList.map((p) => [
        p.invoiceNumber || '-',
        p.supplierName || '-',
        formatDateTime(p.purchaseDate),
        rupiahPlain(p.totalAmount),
      ]),
      margin: { left: 14, right: 14 },
    })
  }

  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Halaman ${i} / ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    )
  }

  const fileName = `laporan-keuangan_${filters.dateFrom}_${filters.dateTo}.pdf`
  doc.save(fileName)
}
