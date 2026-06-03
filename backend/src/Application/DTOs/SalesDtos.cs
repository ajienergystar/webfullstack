namespace LatihanASP.Application.DTOs;

public class SalesFormDataDto
{
    public List<SalesProductDto> Products { get; set; } = [];
    public List<SalesCustomerDto> Customers { get; set; } = [];
    public List<SalesOutletDto> Outlets { get; set; } = [];
    public List<SalesUserDto> Users { get; set; } = [];
}

public class SalesProductDto
{
    public int Id { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Barcode { get; set; }
    public string? CategoryName { get; set; }
    public decimal SellingPrice { get; set; }
    public int Stock { get; set; }
    public string? Unit { get; set; }
}

public class SalesCustomerDto
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = "";
    public string? PhoneNumber { get; set; }
    public int LoyaltyPoint { get; set; }
}

public class SalesOutletDto
{
    public int Id { get; set; }
    public string OutletName { get; set; } = "";
}

public class SalesUserDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Username { get; set; } = "";
    public string RoleName { get; set; } = "";
}

public class CreateSaleItemDto
{
    public int ProductId { get; set; }
    public int Qty { get; set; }
    public decimal Price { get; set; }
    public decimal Discount { get; set; }
}

public class CreateSaleRequestDto
{
    public int? CustomerId { get; set; }
    public int UserId { get; set; }
    public int OutletId { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public decimal PaidAmount { get; set; }
    public List<CreateSaleItemDto> Items { get; set; } = [];
}

public class CreateSaleResponseDto
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public DateTime TransactionDate { get; set; }
}

public class SalesHistoryFilterDto
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string? InvoiceNumber { get; set; }
    public int? CustomerId { get; set; }
    public int? OutletId { get; set; }
    public int? UserId { get; set; }
    public string? PaymentMethod { get; set; }
}

public class SalesHistoryResponseDto
{
    public List<SalesTransactionListItemDto> Transactions { get; set; } = [];
    public int TotalCount { get; set; }
    public decimal TotalGrandTotal { get; set; }
}

public class SalesTransactionListItemDto
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public DateTime TransactionDate { get; set; }
    public int? CustomerId { get; set; }
    public string CustomerName { get; set; } = "Walk-in";
    public int UserId { get; set; }
    public string CashierName { get; set; } = "";
    public int OutletId { get; set; }
    public string OutletName { get; set; } = "";
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal GrandTotal { get; set; }
    public string PaymentMethod { get; set; } = "";
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public int ItemCount { get; set; }
}

public class SalesTransactionDetailDto
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public DateTime TransactionDate { get; set; }
    public int? CustomerId { get; set; }
    public string CustomerName { get; set; } = "Walk-in";
    public string? CustomerPhone { get; set; }
    public int UserId { get; set; }
    public string CashierName { get; set; } = "";
    public string CashierUsername { get; set; } = "";
    public int OutletId { get; set; }
    public string OutletName { get; set; } = "";
    public string? OutletAddress { get; set; }
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal GrandTotal { get; set; }
    public string PaymentMethod { get; set; } = "";
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public List<SalesTransactionDetailItemDto> Items { get; set; } = [];
}

public class SalesTransactionDetailItemDto
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
}
