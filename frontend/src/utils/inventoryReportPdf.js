import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDateTime } from './format'
import {
  computeInventoryCategoryBreakdown,
  computeInventorySummary,
  computeMovementSummary,
  formatInventoryFilterSummary,
  formatReportDateTime,
  movementTypeLabel,
  productStatusLabel,
  rupiahPlain,
} from './inventoryReport'

export function exportInventoryReportPdf({
  overview,
  movements,
  enrichedProducts,
  filters,
  printedBy,
  companyName = 'ERP Point Of Sale',
}) {
  const products = enrichedProducts ?? []
  const summary = computeInventorySummary(products)
  const categories = computeInventoryCategoryBreakdown(products)
  const movementList = movements?.movements ?? []
  const movSummary = computeMovementSummary(movementList)
  const filterText = formatInventoryFilterSummary(filters)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(companyName, pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(13)
  doc.text('LAPORAN INVENTORY', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Filter: ${filterText}`, 14, y)
  y += 5
  doc.text(`Dicetak: ${formatReportDateTime()} · Oleh: ${printedBy || '-'}`, 14, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Ringkasan Persediaan', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    head: [[
      'Total Produk',
      'Aktif',
      'Nonaktif',
      'Total Stok (unit)',
      'Stok Rendah',
      'Nilai Persediaan',
      'Nilai Jual Potensial',
    ]],
    body: [[
      String(summary.count),
      String(summary.activeCount),
      String(summary.inactiveCount),
      String(summary.totalStock),
      String(summary.lowStockCount),
      rupiahPlain(summary.purchaseValue),
      rupiahPlain(summary.sellingValue),
    ]],
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Ringkasan Pergerakan Stok (max 200 baris)', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [52, 152, 219], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    head: [['Baris Riwayat', 'IN (qty)', 'OUT (qty)', 'Net (IN − OUT)']],
    body: [[
      String(movSummary.totalLines),
      String(movSummary.inQty),
      String(movSummary.outQty),
      String(movSummary.netQty),
    ]],
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 6

  if (categories.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Rekap per Kategori', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      head: [['Kategori', 'Produk', 'Total Stok', 'Stok Rendah', 'Nilai Persediaan', 'Nilai Jual']],
      body: categories.map((row) => [
        row.category,
        String(row.count),
        String(row.stock),
        String(row.lowStockCount),
        rupiahPlain(row.purchaseValue),
        rupiahPlain(row.sellingValue),
      ]),
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 6
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Posisi Stok Produk', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    headStyles: { fillColor: [44, 62, 80], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    styles: { overflow: 'linebreak', cellWidth: 'wrap' },
    head: [[
      'No',
      'Kode',
      'Nama',
      'Kategori',
      'Stok',
      'Satuan',
      'Harga Beli',
      'Nilai Persediaan',
      'Status',
    ]],
    body: products.map((p, i) => [
      String(i + 1),
      p.productCode || '-',
      p.productName,
      p.categoryName || '-',
      String(p.stock),
      p.unit || '-',
      rupiahPlain(p.purchasePrice),
      rupiahPlain((p.purchasePrice ?? 0) * (p.stock ?? 0)),
      productStatusLabel(p.isActive),
    ]),
    margin: { left: 14, right: 14 },
    didDrawPage: drawPageFooter(doc, pageWidth),
  })

  if (movementList.length) {
    y = doc.lastAutoTable.finalY + 8
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      y = 14
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Riwayat Pergerakan Stok', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [44, 62, 80], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      head: [['Tanggal', 'Kode', 'Produk', 'Tipe', 'Qty', 'Referensi']],
      body: movementList.map((m) => [
        formatDateTime(m.createdAt),
        m.productCode || '-',
        m.productName,
        movementTypeLabel(m.movementType),
        String(m.qty),
        m.referenceNumber || '-',
      ]),
      margin: { left: 14, right: 14 },
      didDrawPage: drawPageFooter(doc, pageWidth),
    })
  }

  const stamp = new Date().toISOString().slice(0, 10)
  doc.save(`laporan-inventory_${stamp}.pdf`)
}

function drawPageFooter(doc, pageWidth) {
  return (data) => {
    const pageCount = doc.internal.getNumberOfPages()
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Halaman ${data.pageNumber} / ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    )
  }
}
