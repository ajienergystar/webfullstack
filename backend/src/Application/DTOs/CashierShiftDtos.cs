namespace LatihanASP.Application.DTOs;

public class CashierShiftUserDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Username { get; set; } = "";
}

public class CashierShiftListItemDto
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public string UserFullName { get; set; } = "";
    public string Username { get; set; } = "";
    public DateTime OpenTime { get; set; }
    public DateTime? CloseTime { get; set; }
    public decimal? OpeningCash { get; set; }
    public decimal? ClosingCash { get; set; }
}

public class CashierShiftListResponseDto
{
    public List<CashierShiftListItemDto> Shifts { get; set; } = [];
    public int TotalCount { get; set; }
}

public class CashierShiftDetailDto
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public string UserFullName { get; set; } = "";
    public string Username { get; set; } = "";
    public DateTime OpenTime { get; set; }
    public DateTime? CloseTime { get; set; }
    public decimal? OpeningCash { get; set; }
    public decimal? ClosingCash { get; set; }
}

public class CashierShiftFormDataDto
{
    public List<CashierShiftUserDto> Users { get; set; } = [];
}

public class CreateCashierShiftRequestDto
{
    public int UserId { get; set; }
    public DateTime OpenTime { get; set; }
    public DateTime? CloseTime { get; set; }
    public decimal OpeningCash { get; set; }
    public decimal? ClosingCash { get; set; }
}

public class UpdateCashierShiftRequestDto
{
    public int UserId { get; set; }
    public DateTime OpenTime { get; set; }
    public DateTime? CloseTime { get; set; }
    public decimal OpeningCash { get; set; }
    public decimal? ClosingCash { get; set; }
}

public class CreateCashierShiftResponseDto
{
    public long Id { get; set; }
}

public class CashierReportFilterDto
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int? UserId { get; set; }
    /// <summary>all, open, closed</summary>
    public string? ShiftStatus { get; set; }
}

public class CashierReportPaymentDto
{
    public string PaymentMethod { get; set; } = "";
    public int TransactionCount { get; set; }
    public decimal Total { get; set; }
}

public class CashierReportShiftRowDto
{
    public long ShiftId { get; set; }
    public int UserId { get; set; }
    public string CashierName { get; set; } = "";
    public string Username { get; set; } = "";
    public DateTime OpenTime { get; set; }
    public DateTime? CloseTime { get; set; }
    public decimal? OpeningCash { get; set; }
    public decimal? ClosingCash { get; set; }
    public bool IsOpen { get; set; }
    public int TransactionCount { get; set; }
    public decimal TotalSales { get; set; }
    public decimal CashSales { get; set; }
    public decimal NonCashSales { get; set; }
    public decimal? ExpectedClosingCash { get; set; }
    public decimal? CashVariance { get; set; }
}

public class CashierReportCashierSummaryDto
{
    public int UserId { get; set; }
    public string CashierName { get; set; } = "";
    public int ShiftCount { get; set; }
    public int TransactionCount { get; set; }
    public decimal TotalSales { get; set; }
    public decimal CashSales { get; set; }
}

public class CashierReportTransactionDto
{
    public long Id { get; set; }
    public long ShiftId { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public DateTime TransactionDate { get; set; }
    public string CustomerName { get; set; } = "";
    public string OutletName { get; set; } = "";
    public string CashierName { get; set; } = "";
    public int ItemCount { get; set; }
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal GrandTotal { get; set; }
    public string PaymentMethod { get; set; } = "";
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
}

public class CashierReportResponseDto
{
    public List<CashierReportShiftRowDto> Shifts { get; set; } = [];
    public List<CashierReportCashierSummaryDto> CashierSummaries { get; set; } = [];
    public List<CashierReportTransactionDto> Transactions { get; set; } = [];
    public List<CashierReportPaymentDto> PaymentBreakdown { get; set; } = [];
    public int TotalShiftCount { get; set; }
    public int OpenShiftCount { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalCashSales { get; set; }
    public decimal TotalNonCashSales { get; set; }
}
