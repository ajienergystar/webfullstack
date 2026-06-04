import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDateTime } from './format'
import {
  computeCategoryBreakdown,
  computeProductReportSummary,
  formatProductFilterSummary,
  formatReportDateTime,
  productStatusLabel,
  rupiahPlain,
} from './productReport'

export function exportProductReportPdf({
  listData,
  filters,
  formData,
  printedBy,
  companyName = 'LatihanASP POS',
}) {
  const products = listData?.products ?? []
  const summary = computeProductReportSummary(products)
  const categories = computeCategoryBreakdown(products)
  const filterText = formatProductFilterSummary(filters, formData)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(companyName, pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(13)
  doc.text('LAPORAN PRODUK', pageWidth / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
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
    head: [[
      'Total Produk',
      'Aktif',
      'Nonaktif',
      'Total Stok',
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
      head: [['Kategori', 'Jumlah Produk', 'Total Stok', 'Nilai Persediaan', 'Nilai Jual']],
      body: categories.map((row) => [
        row.category,
        String(row.count),
        String(row.stock),
        rupiahPlain(row.purchaseValue),
        rupiahPlain(row.sellingValue),
      ]),
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 6
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Daftar Produk', 14, y)
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
      'Barcode',
      'Kategori',
      'Brand',
      'Harga Beli',
      'Harga Jual',
      'Stok',
      'Satuan',
      'Status',
      'Dibuat',
    ]],
    body: products.map((p, i) => [
      String(i + 1),
      p.productCode || '-',
      p.productName,
      p.barcode || '-',
      p.categoryName || '-',
      p.brandName || '-',
      rupiahPlain(p.purchasePrice),
      rupiahPlain(p.sellingPrice),
      String(p.stock),
      p.unit || '-',
      productStatusLabel(p.isActive),
      formatDateTime(p.createdAt),
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

  const stamp = new Date().toISOString().slice(0, 10)
  doc.save(`laporan-produk_${stamp}.pdf`)
}
