import Modal from '../ui/Modal'
import LoadingState from '../ui/LoadingState'
import {
  DataTable,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from '../ui/Table'
import { formatDateTime, formatRupiah } from '../../utils/format'

export default function RefundDetailModal({ open, onClose, loading, detail }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={detail?.refundNumber}
      subtitle={detail ? `${detail.invoiceNumber} · ${formatDateTime(detail.refundDate)}` : undefined}
      size="md"
    >
      {loading && <LoadingState message="Memuat detail refund..." />}
      {!loading && detail && (
        <>
          <div className="pos-detail-info">
            <div><span>Pelanggan</span><strong>{detail.customerName}</strong></div>
            <div><span>Outlet</span><strong>{detail.outletName}</strong></div>
            <div><span>Kasir</span><strong>{detail.cashierName}</strong></div>
            <div><span>Metode</span><strong>{detail.refundMethod}</strong></div>
            {detail.reason && <div><span>Alasan</span><strong>{detail.reason}</strong></div>}
          </div>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableTh>Kode</TableTh>
                <TableTh>Produk</TableTh>
                <TableTh align="right">Qty</TableTh>
                <TableTh align="right">Harga</TableTh>
                <TableTh align="right">Total</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.items.map((item) => (
                <TableRow key={item.detailId}>
                  <TableTd>{item.productCode}</TableTd>
                  <TableTd>{item.productName}</TableTd>
                  <TableTd align="right">{item.qty}</TableTd>
                  <TableTd align="right">{formatRupiah(item.price)}</TableTd>
                  <TableTd align="right" emphasize>{formatRupiah(item.total)}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
          <div className="pos-detail-totals">
            <div className="pos-grand">
              <span>Total Refund</span>
              <strong>{formatRupiah(detail.totalRefund)}</strong>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
