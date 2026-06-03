import Modal from '../ui/Modal'
import LoadingState from '../ui/LoadingState'
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
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Produk</th>
                  <th>Qty</th>
                  <th>Harga</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.detailId}>
                    <td>{item.productCode}</td>
                    <td>{item.productName}</td>
                    <td>{item.qty}</td>
                    <td>{formatRupiah(item.price)}</td>
                    <td>{formatRupiah(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
