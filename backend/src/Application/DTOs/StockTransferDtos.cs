namespace LatihanASP.Application.DTOs;

public class StockTransferListItemDto
{
    public long Id { get; set; }
    public string ReferenceNumber { get; set; } = "";
    public int FromOutletId { get; set; }
    public string FromOutletName { get; set; } = "";
    public int ToOutletId { get; set; }
    public string ToOutletName { get; set; } = "";
    public DateTime TransferDate { get; set; }
    public string Status { get; set; } = "";
    public int LineCount { get; set; }
    public int TotalQty { get; set; }
}

public class StockTransferListResponseDto
{
    public int TotalCount { get; set; }
    public int TotalQty { get; set; }
    public List<StockTransferListItemDto> Transfers { get; set; } = [];
}

public class StockTransferDetailLineDto
{
    public long Id { get; set; }
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Unit { get; set; }
    public int Qty { get; set; }
}

public class StockTransferDetailResponseDto
{
    public long Id { get; set; }
    public string ReferenceNumber { get; set; } = "";
    public int FromOutletId { get; set; }
    public string FromOutletName { get; set; } = "";
    public int ToOutletId { get; set; }
    public string ToOutletName { get; set; } = "";
    public DateTime TransferDate { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "";
    public List<StockTransferDetailLineDto> Details { get; set; } = [];
}

public class StockTransferOutletOptionDto
{
    public int Id { get; set; }
    public string OutletName { get; set; } = "";
}

public class StockTransferProductOptionDto
{
    public int Id { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Barcode { get; set; }
    public string? CategoryName { get; set; }
    public int Stock { get; set; }
    public string? Unit { get; set; }
}

public class StockTransferFormDataDto
{
    public List<StockTransferOutletOptionDto> Outlets { get; set; } = [];
    public List<StockTransferProductOptionDto> Products { get; set; } = [];
}

public class CreateStockTransferItemDto
{
    public int ProductId { get; set; }
    public int Qty { get; set; }
}

public class CreateStockTransferRequestDto
{
    public string? ReferenceNumber { get; set; }
    public int FromOutletId { get; set; }
    public int ToOutletId { get; set; }
    public DateTime TransferDate { get; set; }
    public string? Notes { get; set; }
    public List<CreateStockTransferItemDto> Items { get; set; } = [];
}

public class UpdateStockTransferRequestDto
{
    public string? ReferenceNumber { get; set; }
    public int FromOutletId { get; set; }
    public int ToOutletId { get; set; }
    public DateTime TransferDate { get; set; }
    public string? Notes { get; set; }
    public List<CreateStockTransferItemDto> Items { get; set; } = [];
}

public class StockTransferMutationResponseDto
{
    public long Id { get; set; }
    public string ReferenceNumber { get; set; } = "";
    public int TotalQty { get; set; }
}
