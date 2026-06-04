namespace LatihanASP.Application.DTOs;

public class StockOverviewResponseDto
{
    public List<StockProductItemDto> Products { get; set; } = [];
    public int TotalProducts { get; set; }
    public int LowStockCount { get; set; }
    public int TotalStockUnits { get; set; }
}

public class StockProductItemDto
{
    public int Id { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? CategoryName { get; set; }
    public string? Unit { get; set; }
    public int Stock { get; set; }
    public bool IsActive { get; set; }
}

public class StockMovementListResponseDto
{
    public List<StockMovementItemDto> Movements { get; set; } = [];
    public int TotalCount { get; set; }
}

public class StockMovementItemDto
{
    public long Id { get; set; }
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string MovementType { get; set; } = "";
    public int Qty { get; set; }
    public string? ReferenceNumber { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class StockFormDataDto
{
    public List<StockProductOptionDto> Products { get; set; } = [];
}

public class StockProductOptionDto
{
    public int Id { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public int Stock { get; set; }
    public string? Unit { get; set; }
}

public class CreateStockAdjustmentRequestDto
{
    public int ProductId { get; set; }
    public string MovementType { get; set; } = "";
    public int Qty { get; set; }
    public string? ReferenceNumber { get; set; }
}

public class StockAdjustmentResponseDto
{
    public long MovementId { get; set; }
    public string ReferenceNumber { get; set; } = "";
    public int ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public string MovementType { get; set; } = "";
    public int Qty { get; set; }
    public int NewStock { get; set; }
}

public class GoodsReceiptItemDto
{
    public int ProductId { get; set; }
    public int Qty { get; set; }
}

public class CreateGoodsReceiptRequestDto
{
    public string? ReferenceNumber { get; set; }
    public long? PurchaseId { get; set; }
    public List<GoodsReceiptItemDto> Items { get; set; } = [];
}

public class GoodsReceiptLineResultDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public int Qty { get; set; }
    public int NewStock { get; set; }
}

public class GoodsReceiptResponseDto
{
    public string ReferenceNumber { get; set; } = "";
    public long? PurchaseId { get; set; }
    public string? PurchaseInvoice { get; set; }
    public int LineCount { get; set; }
    public int TotalQty { get; set; }
    public List<GoodsReceiptLineResultDto> Lines { get; set; } = [];
}
