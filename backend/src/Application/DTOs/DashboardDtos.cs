namespace LatihanASP.Application.DTOs;

public class DashboardResponseDto
{
    public DashboardStatsDto Stats { get; set; } = new();
    public List<SalesChartPointDto> SalesChart { get; set; } = [];
    public List<RecentTransactionDto> RecentTransactions { get; set; } = [];
    public List<TopProductDto> TopProducts { get; set; } = [];
}

public class DashboardStatsDto
{
    public decimal TodaySales { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public string TopProductName { get; set; } = "-";
    public int TopProductSold { get; set; }
    public int LowStockCount { get; set; }
}

public class SalesChartPointDto
{
    public string Date { get; set; } = "";
    public string Label { get; set; } = "";
    public decimal Amount { get; set; }
}

public class RecentTransactionDto
{
    public string InvoiceNumber { get; set; } = "";
    public string CustomerName { get; set; } = "Walk-in";
    public decimal GrandTotal { get; set; }
    public DateTime TransactionDate { get; set; }
}

public class TopProductDto
{
    public string ProductName { get; set; } = "";
    public int TotalSold { get; set; }
}
