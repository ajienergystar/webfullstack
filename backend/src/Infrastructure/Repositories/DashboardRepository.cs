using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private const int LowStockThreshold = 10;
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public DashboardRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<DashboardResponseDto> GetDashboardDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var stats = await LoadStatsAsync(connection);
        var salesChart = await LoadSalesChartAsync(connection);
        var recentTransactions = await LoadRecentTransactionsAsync(connection);
        var topProducts = await LoadTopProductsAsync(connection);

        return new DashboardResponseDto
        {
            Stats = stats,
            SalesChart = salesChart,
            RecentTransactions = recentTransactions,
            TopProducts = topProducts
        };
    }

    private static async Task<DashboardStatsDto> LoadStatsAsync(SqlConnection connection)
    {
        var stats = new DashboardStatsDto();

        await using (var cmd = new SqlCommand(@"
            SELECT ISNULL(SUM(GrandTotal), 0)
            FROM SalesTransactions
            WHERE CAST(TransactionDate AS DATE) = CAST(SYSUTCDATETIME() AS DATE)", connection))
        {
            stats.TodaySales = Convert.ToDecimal(await cmd.ExecuteScalarAsync());
        }

        await using (var cmd = new SqlCommand(@"
            SELECT ISNULL(SUM(GrandTotal), 0)
            FROM SalesTransactions
            WHERE YEAR(TransactionDate) = YEAR(SYSUTCDATETIME())
              AND MONTH(TransactionDate) = MONTH(SYSUTCDATETIME())", connection))
        {
            stats.MonthlyRevenue = Convert.ToDecimal(await cmd.ExecuteScalarAsync());
        }

        await using (var cmd = new SqlCommand(@"
            SELECT TOP 1 P.ProductName, SUM(D.Qty) AS TotalSold
            FROM SalesTransactionDetails D
            INNER JOIN Products P ON D.ProductId = P.Id
            GROUP BY P.ProductName
            ORDER BY TotalSold DESC", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            if (await reader.ReadAsync())
            {
                stats.TopProductName = reader.GetString(0);
                stats.TopProductSold = reader.GetInt32(1);
            }
        }

        await using (var cmd = new SqlCommand(@"
            SELECT COUNT(1) FROM Products
            WHERE IsActive = 1 AND Stock <= @threshold", connection))
        {
            cmd.Parameters.AddWithValue("@threshold", LowStockThreshold);
            stats.LowStockCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        }

        return stats;
    }

    private static async Task<List<SalesChartPointDto>> LoadSalesChartAsync(SqlConnection connection)
    {
        var points = new List<SalesChartPointDto>();

        await using var cmd = new SqlCommand(@"
            SELECT CAST(TransactionDate AS DATE) AS SaleDate,
                   ISNULL(SUM(GrandTotal), 0) AS TotalAmount
            FROM SalesTransactions
            WHERE TransactionDate >= DATEADD(DAY, -6, CAST(SYSUTCDATETIME() AS DATE))
            GROUP BY CAST(TransactionDate AS DATE)
            ORDER BY SaleDate", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var date = reader.GetDateTime(0);
            points.Add(new SalesChartPointDto
            {
                Date = date.ToString("yyyy-MM-dd"),
                Label = date.ToString("dd MMM"),
                Amount = reader.GetDecimal(1)
            });
        }

        return points;
    }

    private static async Task<List<RecentTransactionDto>> LoadRecentTransactionsAsync(SqlConnection connection)
    {
        var list = new List<RecentTransactionDto>();

        await using var cmd = new SqlCommand(@"
            SELECT TOP 10
                S.InvoiceNumber,
                ISNULL(C.CustomerName, 'Walk-in') AS CustomerName,
                S.GrandTotal,
                S.TransactionDate
            FROM SalesTransactions S
            LEFT JOIN Customers C ON S.CustomerId = C.Id
            ORDER BY S.TransactionDate DESC", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new RecentTransactionDto
            {
                InvoiceNumber = reader.GetString(0),
                CustomerName = reader.GetString(1),
                GrandTotal = reader.GetDecimal(2),
                TransactionDate = reader.GetDateTime(3)
            });
        }

        return list;
    }

    private static async Task<List<TopProductDto>> LoadTopProductsAsync(SqlConnection connection)
    {
        var list = new List<TopProductDto>();

        await using var cmd = new SqlCommand(@"
            SELECT TOP 5
                P.ProductName,
                SUM(D.Qty) AS TotalSold
            FROM SalesTransactionDetails D
            INNER JOIN Products P ON D.ProductId = P.Id
            GROUP BY P.ProductName
            ORDER BY TotalSold DESC", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new TopProductDto
            {
                ProductName = reader.GetString(0),
                TotalSold = reader.GetInt32(1)
            });
        }

        return list;
    }
}
