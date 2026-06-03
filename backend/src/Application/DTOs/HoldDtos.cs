namespace LatihanASP.Application.DTOs;

public class CreateHoldItemDto
{
    public int ProductId { get; set; }
    public int Qty { get; set; }
    public decimal Price { get; set; }
    public decimal Discount { get; set; }
}

public class CreateHoldRequestDto
{
    public int? CustomerId { get; set; }
    public int UserId { get; set; }
    public int OutletId { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public string? Notes { get; set; }
    public List<CreateHoldItemDto> Items { get; set; } = [];
}

public class UpdateHoldRequestDto
{
    public int? CustomerId { get; set; }
    public int UserId { get; set; }
    public int OutletId { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public string? Notes { get; set; }
    public List<CreateHoldItemDto> Items { get; set; } = [];
}

public class CompleteHoldRequestDto
{
    public string PaymentMethod { get; set; } = "Cash";
    public decimal PaidAmount { get; set; }
}

public class CreateHoldResponseDto
{
    public long Id { get; set; }
    public string HoldNumber { get; set; } = "";
    public decimal GrandTotal { get; set; }
    public DateTime HeldAt { get; set; }
}

public class HoldListResponseDto
{
    public List<HoldListItemDto> Holds { get; set; } = [];
    public int TotalCount { get; set; }
}

public class HoldListItemDto
{
    public long Id { get; set; }
    public string HoldNumber { get; set; } = "";
    public DateTime HeldAt { get; set; }
    public string CustomerName { get; set; } = "Walk-in";
    public string CashierName { get; set; } = "";
    public string OutletName { get; set; } = "";
    public decimal GrandTotal { get; set; }
    public string Status { get; set; } = "HOLD";
    public string? Notes { get; set; }
    public int ItemCount { get; set; }
}

public class HoldDetailDto
{
    public long Id { get; set; }
    public string HoldNumber { get; set; } = "";
    public DateTime HeldAt { get; set; }
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
    public string? Notes { get; set; }
    public string Status { get; set; } = "HOLD";
    public List<HoldDetailItemDto> Items { get; set; } = [];
}

public class HoldDetailItemDto
{
    public long DetailId { get; set; }
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Unit { get; set; }
    public int Stock { get; set; }
    public int Qty { get; set; }
    public decimal Price { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
}

public class CompleteHoldResponseDto
{
    public long HoldId { get; set; }
    public string HoldNumber { get; set; } = "";
    public long SalesId { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public decimal GrandTotal { get; set; }
    public decimal ChangeAmount { get; set; }
}
