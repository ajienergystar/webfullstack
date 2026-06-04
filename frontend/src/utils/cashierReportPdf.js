import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDateTime } from './format'
import {
  computeCashierReportSummary,
  formatCashierFilterSummary,
  formatReportDate,
  formatReportDateTime,
  formatVariance,
  rupiahPlain,
} from './cashierReport'

export function exportCashierReportPdf({
  report,
  filters,
  formData,
  printedBy,
  companyName = 'LatihanASP POS',
}) {
  const summary = computeCashierReportSummary(report)
  const filterText = formatCashierFilterSummary(filters, formData)
  const shifts = report?.shifts ?? []
  const payments = report?.paymentBreakdown ?? []
  const cashiers = report?.cashierSummaries ?? []
  const transactions = report?.transactions ?? []

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(companyName, pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(13)
  doc.text('LAPORAN KASIR', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    `Periode shift: ${formatReportDate(filters.dateFrom)} — ${formatReportDate(filters.dateTo)}`,
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
  doc.text('Ringkasan', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    head: [['Shift', 'Transaksi', 'Penjualan', 'Tunai', 'Non-Tunai', 'Shift Aktif']],
    body: [[
      String(summary.shiftCount),
      String(summary.transactionCount),
      rupiahPlain(summary.totalSales),
      rupiahPlain(summary.cashSales),
      rupiahPlain(summary.nonCashSales),
      String(summary.openShiftCount),
    ]],
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 6

  if (cashiers.length) {
    doc.setFont('helvetica', 'bold')
    doc.text('Rekap per Kasir', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Kasir', 'Shift', 'Transaksi', 'Penjualan', 'Tunai']],
      body: cashiers.map((c) => [
        c.cashierName,
        String(c.shiftCount),
        String(c.transactionCount),
        rupiahPlain(c.totalSales),
        rupiahPlain(c.cashSales),
      ]),
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 6
  }

  if (payments.length) {
    doc.setFont('helvetica', 'bold')
    doc.text('Rekap Metode Pembayaran', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [39, 174, 96], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Metode', 'Jumlah', 'Total']],
      body: payments.map((p) => [
        p.paymentMethod,
        String(p.transactionCount),
        rupiahPlain(p.total),
      ]),
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 6
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Detail Shift Kasir', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    headStyles: { fillColor: [44, 62, 80], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    head: [[
      'No',
      'Kasir',
      'Buka',
      'Tutup',
      'Kas Awal',
      'Kas Tutup',
      'Trx',
      'Penjualan',
      'Tunai',
      'Non-Tunai',
      'Ekspektasi',
      'Selisih',
      'Status',
    ]],
    body: shifts.map((s, i) => [
      String(i + 1),
      s.cashierName,
      formatDateTime(s.openTime),
      s.closeTime ? formatDateTime(s.closeTime) : '-',
      s.openingCash != null ? rupiahPlain(s.openingCash) : '-',
      s.closingCash != null ? rupiahPlain(s.closingCash) : '-',
      String(s.transactionCount),
      rupiahPlain(s.totalSales),
      rupiahPlain(s.cashSales),
      rupiahPlain(s.nonCashSales),
      s.expectedClosingCash != null ? rupiahPlain(s.expectedClosingCash) : '-',
      s.cashVariance != null ? formatVariance(s.cashVariance) : '-',
      s.isOpen ? 'Aktif' : 'Tutup',
    ]),
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 6

  if (transactions.length) {
    doc.setFont('helvetica', 'bold')
    doc.text('Detail Transaksi dalam Shift', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      styles: { overflow: 'linebreak', cellWidth: 'wrap' },
      head: [[
        'No',
        'Shift',
        'Invoice',
        'Tanggal',
        'Kasir',
        'Outlet',
        'Total',
        'Metode',
      ]],
      body: transactions.map((tx, i) => [
        String(i + 1),
        String(tx.shiftId),
        tx.invoiceNumber,
        formatDateTime(tx.transactionDate),
        tx.cashierName,
        tx.outletName,
        rupiahPlain(tx.grandTotal),
        tx.paymentMethod || '-',
      ]),
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages()
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Halaman ${data.pageNumber} / ${pageCount}`,
          pageWidth - 14,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'right' },
        )
      },
    })
  }

  const stamp = `${filters.dateFrom}_${filters.dateTo}`
  const statusPart = filters.shiftStatus ? `_${filters.shiftStatus}` : ''
  doc.save(`laporan-kasir_${stamp}${statusPart}.pdf`)
}
