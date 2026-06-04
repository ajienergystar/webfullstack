namespace LatihanASP.Application.DTOs;

public class PurchaseListItemDto
{
    public long Id { get; set; }
    public string? InvoiceNumber { get; set; }
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public DateTime PurchaseDate { get; set; }
    public decimal? TotalAmount { get; set; }
    public int LineCount { get; set; }
}

public class PurchaseListResponseDto
{
    public int TotalCount { get; set; }
    public decimal TotalAmount { get; set; }
    public List<PurchaseListItemDto> Purchases { get; set; } = [];
}

public class PurchaseDetailLineDto
{
    public long Id { get; set; }
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Unit { get; set; }
    public int Qty { get; set; }
    public decimal Price { get; set; }
    public decimal Total { get; set; }
}

public class PurchaseDetailResponseDto
{
    public long Id { get; set; }
    public string? InvoiceNumber { get; set; }
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public DateTime PurchaseDate { get; set; }
    public decimal? TotalAmount { get; set; }
    public List<PurchaseDetailLineDto> Details { get; set; } = [];
}

public class PurchaseSupplierOptionDto
{
    public int Id { get; set; }
    public string SupplierName { get; set; } = "";
}

public class PurchaseProductOptionDto
{
    public int Id { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Barcode { get; set; }
    public string? CategoryName { get; set; }
    public decimal PurchasePrice { get; set; }
    public int Stock { get; set; }
    public string? Unit { get; set; }
}

public class PurchaseFormDataDto
{
    public List<PurchaseSupplierOptionDto> Suppliers { get; set; } = [];
    public List<PurchaseProductOptionDto> Products { get; set; } = [];
}

public class CreatePurchaseItemDto
{
    public int ProductId { get; set; }
    public int Qty { get; set; }
    public decimal Price { get; set; }
}

public class CreatePurchaseRequestDto
{
    public string? InvoiceNumber { get; set; }
    public int? SupplierId { get; set; }
    public DateTime PurchaseDate { get; set; }
    public List<CreatePurchaseItemDto> Items { get; set; } = [];
}

public class UpdatePurchaseRequestDto
{
    public string? InvoiceNumber { get; set; }
    public int? SupplierId { get; set; }
    public DateTime PurchaseDate { get; set; }
    public List<CreatePurchaseItemDto> Items { get; set; } = [];
}

public class PurchaseMutationResponseDto
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public decimal TotalAmount { get; set; }
}
