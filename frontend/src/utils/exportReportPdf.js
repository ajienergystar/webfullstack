import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDateTime } from './format'
import {
  executiveSummaryRows,
  formatExportFilterSummary,
  formatModulesSummary,
  formatReportDate,
  formatReportDateTime,
} from './exportReport'
import { rupiahPlain } from './salesReport'
import { formatSignedRupiah } from './financeReport'

function addPageFooter(doc, pageWidth) {
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
}

export function exportConsolidatedReportPdf({
  snapshot,
  filters,
  formData,
  printedBy,
  companyName = 'ERP Point Of Sale',
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(companyName, pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(13)
  doc.text('LAPORAN EKSPOR / RINGKASAN POS', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    `Periode: ${formatReportDate(filters.dateFrom)} — ${formatReportDate(filters.dateTo)}`,
    14,
    y,
  )
  y += 5
  doc.text(`Filter: ${formatExportFilterSummary(filters, formData)}`, 14, y)
  y += 5
  doc.text(`Modul: ${formatModulesSummary(snapshot?.modules)}`, 14, y)
  y += 5
  doc.text(`Dicetak: ${formatReportDateTime()} · Oleh: ${printedBy || '-'}`, 14, y)
  y += 8

  const execRows = executiveSummaryRows(snapshot)
  if (execRows.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Ringkasan Eksekutif', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Modul', 'Indikator', 'Nilai', 'Keterangan']],
      body: execRows.map((r) => [
        r.modul,
        r.indikator,
        rupiahPlain(r.nilai),
        r.satuan,
      ]),
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 8
  }

  if (snapshot.penjualan) {
    const s = snapshot.penjualan.summary
    doc.setFont('helvetica', 'bold')
    doc.text('Penjualan (SalesTransactions)', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Transaksi', 'Subtotal', 'Diskon', 'Pajak', 'GrandTotal']],
      body: [[
        String(s.count),
        rupiahPlain(s.subTotal),
        rupiahPlain(s.discount),
        rupiahPlain(s.tax),
        rupiahPlain(s.grandTotal),
      ]],
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6

    const payments = snapshot.penjualan.payments ?? []
    if (payments.length) {
      autoTable(doc, {
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        head: [['Metode Pembayaran', 'Trx', 'Total']],
        body: payments.map((p) => [
          p.method,
          String(p.count),
          rupiahPlain(p.total),
        ]),
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 8
    }
  }

  if (snapshot.keuangan) {
    doc.setFont('helvetica', 'bold')
    doc.text('Keuangan — Laporan Laba Rugi', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [39, 174, 96], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Pos', 'Jumlah (Rp)']],
      body: snapshot.keuangan.incomeRows.map((row) => [
        row.label,
        formatSignedRupiah(row.amount).replace(/\u00a0/g, ' '),
      ]),
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (snapshot.produk) {
    const s = snapshot.produk.summary
    doc.setFont('helvetica', 'bold')
    doc.text('Produk (Products)', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [142, 68, 173], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['SKU', 'Stok Total', 'Nilai Beli', 'Nilai Jual', 'Stok Rendah']],
      body: [[
        String(s.count),
        String(s.totalStock),
        rupiahPlain(s.purchaseValue),
        rupiahPlain(s.sellingValue),
        String(s.lowStockCount),
      ]],
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (snapshot.inventory) {
    const s = snapshot.inventory.summary
    doc.setFont('helvetica', 'bold')
    doc.text('Inventory (Products + StockMovements)', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [230, 126, 34], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Item', 'Stok', 'Nilai Beli', 'Nilai Jual', 'Stok ≤5']],
      body: [[
        String(s.count),
        String(s.totalStock),
        rupiahPlain(s.purchaseValue),
        rupiahPlain(s.sellingValue),
        String(s.lowStockCount),
      ]],
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (snapshot.kasir) {
    const s = snapshot.kasir.summary
    doc.setFont('helvetica', 'bold')
    doc.text('Kasir (CashierShifts)', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Shift', 'Transaksi', 'Penjualan', 'Tunai', 'Non-Tunai']],
      body: [[
        String(s.shiftCount),
        String(s.transactionCount),
        rupiahPlain(s.totalSales),
        rupiahPlain(s.cashSales),
        rupiahPlain(s.nonCashSales),
      ]],
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6

    const shifts = snapshot.kasir.shifts ?? []
    if (shifts.length) {
      autoTable(doc, {
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        head: [['Kasir', 'Buka', 'Tutup', 'Trx', 'Penjualan', 'Status']],
        body: shifts.map((sh) => [
          sh.cashierName,
          formatDateTime(sh.openTime),
          sh.closeTime ? formatDateTime(sh.closeTime) : '-',
          String(sh.transactionCount),
          rupiahPlain(sh.totalSales),
          sh.isOpen ? 'Aktif' : 'Tutup',
        ]),
        margin: { left: 14, right: 14 },
      })
    }
  }

  addPageFooter(doc, pageWidth)

  const modPart = Object.entries(snapshot?.modules ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join('-')
  doc.save(`laporan-export_${filters.dateFrom}_${filters.dateTo}_${modPart || 'all'}.pdf`)
}
