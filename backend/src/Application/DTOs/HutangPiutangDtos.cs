namespace LatihanASP.Application.DTOs;

public class HutangPiutangListResponseDto
{
    public List<HutangPiutangListItemDto> Records { get; set; } = [];
    public int TotalCount { get; set; }
    public decimal TotalPiutangBalance { get; set; }
    public decimal TotalHutangBalance { get; set; }
}

public class HutangPiutangListItemDto
{
    public long Id { get; set; }
    public string ReferenceNumber { get; set; } = "";
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = "";
    public string? PhoneNumber { get; set; }
    public string Type { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal Balance { get; set; }
    public DateTime RecordDate { get; set; }
    public DateTime? DueDate { get; set; }
    public long? SalesTransactionId { get; set; }
    public string? InvoiceNumber { get; set; }
    public string Status { get; set; } = "";
    public string? Description { get; set; }
    public string? Notes { get; set; }
}

public class HutangPiutangCustomerOptionDto
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = "";
    public string? PhoneNumber { get; set; }
}

public class HutangPiutangSalesOptionDto
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public DateTime TransactionDate { get; set; }
    public decimal GrandTotal { get; set; }
}

public class CreateHutangPiutangRequestDto
{
    public string ReferenceNumber { get; set; } = "";
    public int CustomerId { get; set; }
    public string Type { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public DateTime RecordDate { get; set; }
    public DateTime? DueDate { get; set; }
    public long? SalesTransactionId { get; set; }
    public string Status { get; set; } = "OPEN";
    public string? Description { get; set; }
    public string? Notes { get; set; }
}

public class UpdateHutangPiutangRequestDto : CreateHutangPiutangRequestDto
{
}

public class HutangPiutangMutationResponseDto
{
    public long Id { get; set; }
    public string ReferenceNumber { get; set; } = "";
}
