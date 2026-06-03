namespace LatihanASP.Application.DTOs;

public class RefundListResponseDto
{
    public List<RefundListItemDto> Refunds { get; set; } = [];
    public int TotalCount { get; set; }
    public decimal TotalRefundAmount { get; set; }
}

public class RefundListItemDto
{
    public long Id { get; set; }
    public string RefundNumber { get; set; } = "";
    public DateTime RefundDate { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public string CustomerName { get; set; } = "Walk-in";
    public string CashierName { get; set; } = "";
    public string OutletName { get; set; } = "";
    public decimal TotalRefund { get; set; }
    public string RefundMethod { get; set; } = "";
    public string? Reason { get; set; }
    public int ItemCount { get; set; }
}

public class SaleForRefundDto
{
    public long SalesTransactionId { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public DateTime TransactionDate { get; set; }
    public int? CustomerId { get; set; }
    public string CustomerName { get; set; } = "Walk-in";
    public int UserId { get; set; }
    public int OutletId { get; set; }
    public string OutletName { get; set; } = "";
    public decimal GrandTotal { get; set; }
    public string PaymentMethod { get; set; } = "";
    public List<SaleLineForRefundDto> Lines { get; set; } = [];
}

public class SaleLineForRefundDto
{
    public long SalesDetailId { get; set; }
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Unit { get; set; }
    public int SoldQty { get; set; }
    public int RefundedQty { get; set; }
    public int AvailableQty { get; set; }
    public decimal Price { get; set; }
}

public class CreateRefundItemDto
{
    public long SalesDetailId { get; set; }
    public int ProductId { get; set; }
    public int Qty { get; set; }
    public decimal Price { get; set; }
}

public class CreateRefundRequestDto
{
    public long SalesTransactionId { get; set; }
    public int UserId { get; set; }
    public int OutletId { get; set; }
    public string? Reason { get; set; }
    public string RefundMethod { get; set; } = "Cash";
    public List<CreateRefundItemDto> Items { get; set; } = [];
}

public class CreateRefundResponseDto
{
    public long Id { get; set; }
    public string RefundNumber { get; set; } = "";
    public decimal TotalRefund { get; set; }
    public DateTime RefundDate { get; set; }
}

public class RefundDetailDto
{
    public long Id { get; set; }
    public string RefundNumber { get; set; } = "";
    public DateTime RefundDate { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string CashierName { get; set; } = "";
    public string OutletName { get; set; } = "";
    public decimal TotalRefund { get; set; }
    public string RefundMethod { get; set; } = "";
    public string? Reason { get; set; }
    public List<RefundDetailItemDto> Items { get; set; } = [];
}

public class RefundDetailItemDto
{
    public long DetailId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public int Qty { get; set; }
    public decimal Price { get; set; }
    public decimal Total { get; set; }
}
