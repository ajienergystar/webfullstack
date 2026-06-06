namespace LatihanASP.Application.DTOs;

public class OnlineOrderListResponseDto
{
    public List<OnlineOrderListItemDto> Orders { get; set; } = [];
    public int TotalCount { get; set; }
    public int PendingCount { get; set; }
    public int ActiveCount { get; set; }
    public decimal TotalGrandTotal { get; set; }
}

public class OnlineOrderListItemDto
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public DateTime OrderDate { get; set; }
    public string CustomerName { get; set; } = "";
    public string? CustomerPhone { get; set; }
    public string OutletName { get; set; } = "";
    public string OrderSource { get; set; } = "";
    public string FulfillmentType { get; set; } = "";
    public decimal GrandTotal { get; set; }
    public string PaymentStatus { get; set; } = "";
    public string? PaymentMethod { get; set; }
    public string OrderStatus { get; set; } = "";
    public int ItemCount { get; set; }
    public string? Notes { get; set; }
}

public class OnlineOrderDetailDto
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public DateTime OrderDate { get; set; }
    public int? CustomerId { get; set; }
    public string CustomerName { get; set; } = "";
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? DeliveryAddress { get; set; }
    public int OutletId { get; set; }
    public string OutletName { get; set; } = "";
    public string OrderSource { get; set; } = "";
    public string FulfillmentType { get; set; } = "";
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal GrandTotal { get; set; }
    public string PaymentStatus { get; set; } = "";
    public string? PaymentMethod { get; set; }
    public string OrderStatus { get; set; } = "";
    public string? Notes { get; set; }
    public string? ExternalOrderId { get; set; }
    public long? SalesTransactionId { get; set; }
    public string? InvoiceNumber { get; set; }
    public List<OnlineOrderDetailItemDto> Items { get; set; } = [];
}

public class OnlineOrderDetailItemDto
{
    public long DetailId { get; set; }
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Unit { get; set; }
    public int Qty { get; set; }
    public decimal Price { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
    public string? Notes { get; set; }
}

public class UpdateOnlineOrderStatusRequestDto
{
    public string OrderStatus { get; set; } = "";
    public int? ProcessedByUserId { get; set; }
}

public class CompleteOnlineOrderRequestDto
{
    public int UserId { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
}

public class CompleteOnlineOrderResponseDto
{
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = "";
    public long SalesId { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public decimal GrandTotal { get; set; }
}
