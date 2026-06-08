import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDateTime } from './format'
import {
  computePaymentBreakdown,
  computeSalesReportSummary,
  formatFilterSummary,
  formatReportDate,
  formatReportDateTime,
  rupiahPlain,
} from './salesReport'

export function exportSalesReportPdf({
  history,
  filters,
  formData,
  printedBy,
  companyName = 'ERP Point Of Sale',
}) {
  const transactions = history?.transactions ?? []
  const summary = computeSalesReportSummary(transactions)
  const payments = computePaymentBreakdown(transactions)
  const filterText = formatFilterSummary(filters, formData)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(companyName, pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(13)
  doc.text('LAPORAN PENJUALAN', pageWidth / 2, y, { align: 'center' })
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
  doc.text('Ringkasan', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    head: [['Transaksi', 'Subtotal', 'Diskon', 'Pajak', 'Total Penjualan']],
    body: [[
      String(summary.count),
      rupiahPlain(summary.subTotal),
      rupiahPlain(summary.discount),
      rupiahPlain(summary.tax),
      rupiahPlain(summary.grandTotal),
    ]],
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 6

  if (payments.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Rekap Metode Pembayaran', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Metode', 'Jumlah Transaksi', 'Total']],
      body: payments.map((p) => [
        p.method,
        String(p.count),
        rupiahPlain(p.total),
      ]),
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 6
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Detail Transaksi', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    headStyles: { fillColor: [44, 62, 80], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    styles: { overflow: 'linebreak', cellWidth: 'wrap' },
    head: [[
      'No',
      'Invoice',
      'Tanggal',
      'Pelanggan',
      'Outlet',
      'Kasir',
      'Item',
      'Subtotal',
      'Diskon',
      'Pajak',
      'Total',
      'Bayar',
      'Metode',
    ]],
    body: transactions.map((tx, i) => [
      String(i + 1),
      tx.invoiceNumber,
      formatDateTime(tx.transactionDate),
      tx.customerName,
      tx.outletName,
      tx.cashierName,
      String(tx.itemCount),
      rupiahPlain(tx.subTotal),
      rupiahPlain(tx.discount),
      rupiahPlain(tx.tax),
      rupiahPlain(tx.grandTotal),
      rupiahPlain(tx.paidAmount),
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

  const fileName = `laporan-penjualan_${filters.dateFrom}_${filters.dateTo}.pdf`
  doc.save(fileName)
}
