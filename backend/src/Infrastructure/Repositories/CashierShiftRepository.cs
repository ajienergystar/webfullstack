using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class CashierShiftRepository : ICashierShiftRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public CashierShiftRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<CashierShiftFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var users = new List<CashierShiftUserDto>();

        await using var cmd = new SqlCommand(@"
            SELECT Id, FullName, Username
            FROM Users
            WHERE IsActive = 1
            ORDER BY FullName, Username", connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            users.Add(new CashierShiftUserDto
            {
                Id = reader.GetInt32(0),
                FullName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                Username = reader.IsDBNull(2) ? "" : reader.GetString(2)
            });
        }

        return new CashierShiftFormDataDto { Users = users };
    }

    public async Task<CashierShiftListResponseDto> GetAllAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var shifts = new List<CashierShiftListItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT S.Id, S.UserId, U.FullName, U.Username,
                   S.OpenTime, S.CloseTime, S.OpeningCash, S.ClosingCash
            FROM CashierShifts S
            INNER JOIN Users U ON S.UserId = U.Id
            ORDER BY S.OpenTime DESC", connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            shifts.Add(MapListItem(reader));
        }

        return new CashierShiftListResponseDto
        {
            Shifts = shifts,
            TotalCount = shifts.Count
        };
    }

    public async Task<CashierShiftDetailDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT S.Id, S.UserId, U.FullName, U.Username,
                   S.OpenTime, S.CloseTime, S.OpeningCash, S.ClosingCash
            FROM CashierShifts S
            INNER JOIN Users U ON S.UserId = U.Id
            WHERE S.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new CashierShiftDetailDto
        {
            Id = reader.GetInt64(0),
            UserId = reader.GetInt32(1),
            UserFullName = reader.IsDBNull(2) ? "" : reader.GetString(2),
            Username = reader.IsDBNull(3) ? "" : reader.GetString(3),
            OpenTime = reader.GetDateTime(4),
            CloseTime = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
            OpeningCash = reader.IsDBNull(6) ? null : reader.GetDecimal(6),
            ClosingCash = reader.IsDBNull(7) ? null : reader.GetDecimal(7)
        };
    }

    public async Task<bool> UserExistsAsync(int userId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Users WHERE Id = @id AND IsActive = 1", connection);
        cmd.Parameters.AddWithValue("@id", userId);
        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<bool> HasOpenShiftAsync(int userId, long? excludeId = null)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = "SELECT COUNT(1) FROM CashierShifts WHERE UserId = @userId AND CloseTime IS NULL";
        if (excludeId.HasValue)
            sql += " AND Id <> @excludeId";

        await using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@userId", userId);
        if (excludeId.HasValue)
            cmd.Parameters.AddWithValue("@excludeId", excludeId.Value);

        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<long> CreateAsync(CreateCashierShiftRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO CashierShifts (UserId, OpenTime, CloseTime, OpeningCash, ClosingCash)
            OUTPUT INSERTED.Id
            VALUES (@userId, @openTime, @closeTime, @openingCash, @closingCash)", connection);

        cmd.Parameters.AddWithValue("@userId", request.UserId);
        cmd.Parameters.AddWithValue("@openTime", request.OpenTime);
        cmd.Parameters.AddWithValue("@closeTime", (object?)request.CloseTime ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@openingCash", request.OpeningCash);
        cmd.Parameters.AddWithValue("@closingCash", (object?)request.ClosingCash ?? DBNull.Value);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    public async Task UpdateAsync(long id, UpdateCashierShiftRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            UPDATE CashierShifts
            SET UserId = @userId,
                OpenTime = @openTime,
                CloseTime = @closeTime,
                OpeningCash = @openingCash,
                ClosingCash = @closingCash
            WHERE Id = @id", connection);

        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@userId", request.UserId);
        cmd.Parameters.AddWithValue("@openTime", request.OpenTime);
        cmd.Parameters.AddWithValue("@closeTime", (object?)request.CloseTime ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@openingCash", request.OpeningCash);
        cmd.Parameters.AddWithValue("@closingCash", (object?)request.ClosingCash ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<CashierReportResponseDto> GetReportAsync(CashierReportFilterDto filter)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var filterValues = new List<(string Name, object Value)>();

        if (filter.DateFrom.HasValue)
        {
            where.Add("CAST(S.OpenTime AS DATE) >= @dateFrom");
            filterValues.Add(("@dateFrom", filter.DateFrom.Value.Date));
        }

        if (filter.DateTo.HasValue)
        {
            where.Add("CAST(S.OpenTime AS DATE) <= @dateTo");
            filterValues.Add(("@dateTo", filter.DateTo.Value.Date));
        }

        if (filter.UserId.HasValue)
        {
            where.Add("S.UserId = @userId");
            filterValues.Add(("@userId", filter.UserId.Value));
        }

        var status = filter.ShiftStatus?.Trim().ToLowerInvariant();
        if (status == "open")
            where.Add("S.CloseTime IS NULL");
        else if (status == "closed")
            where.Add("S.CloseTime IS NOT NULL");

        var whereClause = string.Join(" AND ", where);
        var joinSales = @"
            LEFT JOIN SalesTransactions ST ON ST.UserId = S.UserId
                AND ST.TransactionDate >= S.OpenTime
                AND (S.CloseTime IS NULL OR ST.TransactionDate <= S.CloseTime)";

        var shiftParams = new SqlCommand { Connection = connection };
        foreach (var (name, value) in filterValues)
            shiftParams.Parameters.AddWithValue(name, value);

        shiftParams.CommandText = $@"
            SELECT
                S.Id, S.UserId, U.FullName, U.Username,
                S.OpenTime, S.CloseTime, S.OpeningCash, S.ClosingCash,
                COUNT(ST.Id) AS TxCount,
                ISNULL(SUM(ST.GrandTotal), 0) AS TotalSales,
                ISNULL(SUM(CASE WHEN ST.PaymentMethod = 'Cash' THEN ST.GrandTotal ELSE 0 END), 0) AS CashSales,
                ISNULL(SUM(CASE WHEN ST.PaymentMethod IS NULL OR ST.PaymentMethod <> 'Cash' THEN ST.GrandTotal ELSE 0 END), 0) AS NonCashSales
            FROM CashierShifts S
            INNER JOIN Users U ON S.UserId = U.Id
            {joinSales}
            WHERE {whereClause}
            GROUP BY
                S.Id, S.UserId, U.FullName, U.Username,
                S.OpenTime, S.CloseTime, S.OpeningCash, S.ClosingCash
            ORDER BY S.OpenTime DESC";

        var shifts = new List<CashierReportShiftRowDto>();
        await using (shiftParams)
        await using (var reader = await shiftParams.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var openingCash = reader.IsDBNull(6) ? (decimal?)null : reader.GetDecimal(6);
                var closingCash = reader.IsDBNull(7) ? (decimal?)null : reader.GetDecimal(7);
                var cashSales = reader.GetDecimal(10);
                decimal? expectedClosing = openingCash.HasValue
                    ? openingCash.Value + cashSales
                    : null;
                decimal? variance = closingCash.HasValue && expectedClosing.HasValue
                    ? closingCash.Value - expectedClosing.Value
                    : null;

                shifts.Add(new CashierReportShiftRowDto
                {
                    ShiftId = reader.GetInt64(0),
                    UserId = reader.GetInt32(1),
                    CashierName = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    Username = reader.IsDBNull(3) ? "" : reader.GetString(3),
                    OpenTime = reader.GetDateTime(4),
                    CloseTime = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    OpeningCash = openingCash,
                    ClosingCash = closingCash,
                    IsOpen = reader.IsDBNull(5),
                    TransactionCount = reader.GetInt32(8),
                    TotalSales = reader.GetDecimal(9),
                    CashSales = cashSales,
                    NonCashSales = reader.GetDecimal(11),
                    ExpectedClosingCash = expectedClosing,
                    CashVariance = variance
                });
            }
        }

        var txCmd = new SqlCommand { Connection = connection };
        foreach (var (name, value) in filterValues)
            txCmd.Parameters.AddWithValue(name, value);

        txCmd.CommandText = $@"
            SELECT
                ST.Id, S.Id AS ShiftId, ST.InvoiceNumber, ST.TransactionDate,
                ISNULL(C.CustomerName, 'Walk-in'),
                ISNULL(O.OutletName, ''),
                ISNULL(U.FullName, ''),
                (SELECT COUNT(1) FROM SalesTransactionDetails D WHERE D.SalesTransactionId = ST.Id),
                ST.SubTotal, ST.Discount, ST.Tax, ST.GrandTotal,
                ISNULL(ST.PaymentMethod, ''), ST.PaidAmount, ST.ChangeAmount
            FROM SalesTransactions ST
            INNER JOIN CashierShifts S ON ST.UserId = S.UserId
                AND ST.TransactionDate >= S.OpenTime
                AND (S.CloseTime IS NULL OR ST.TransactionDate <= S.CloseTime)
            LEFT JOIN Customers C ON ST.CustomerId = C.Id
            LEFT JOIN Users U ON ST.UserId = U.Id
            LEFT JOIN Outlets O ON ST.OutletId = O.Id
            WHERE {whereClause}
            ORDER BY ST.TransactionDate DESC";

        var transactions = new List<CashierReportTransactionDto>();
        await using (txCmd)
        await using (var reader = await txCmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                transactions.Add(new CashierReportTransactionDto
                {
                    Id = reader.GetInt64(0),
                    ShiftId = reader.GetInt64(1),
                    InvoiceNumber = reader.GetString(2),
                    TransactionDate = reader.GetDateTime(3),
                    CustomerName = reader.GetString(4),
                    OutletName = reader.GetString(5),
                    CashierName = reader.GetString(6),
                    ItemCount = reader.GetInt32(7),
                    SubTotal = reader.GetDecimal(8),
                    Discount = reader.GetDecimal(9),
                    Tax = reader.GetDecimal(10),
                    GrandTotal = reader.GetDecimal(11),
                    PaymentMethod = reader.GetString(12),
                    PaidAmount = reader.GetDecimal(13),
                    ChangeAmount = reader.GetDecimal(14)
                });
            }
        }

        var payCmd = new SqlCommand { Connection = connection };
        foreach (var (name, value) in filterValues)
            payCmd.Parameters.AddWithValue(name, value);

        payCmd.CommandText = $@"
            SELECT
                ISNULL(ST.PaymentMethod, 'Lainnya') AS PaymentMethod,
                COUNT(ST.Id) AS TxCount,
                ISNULL(SUM(ST.GrandTotal), 0) AS Total
            FROM SalesTransactions ST
            INNER JOIN CashierShifts S ON ST.UserId = S.UserId
                AND ST.TransactionDate >= S.OpenTime
                AND (S.CloseTime IS NULL OR ST.TransactionDate <= S.CloseTime)
            WHERE {whereClause}
            GROUP BY ISNULL(ST.PaymentMethod, 'Lainnya')
            ORDER BY Total DESC";

        var paymentBreakdown = new List<CashierReportPaymentDto>();
        await using (payCmd)
        await using (var reader = await payCmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                paymentBreakdown.Add(new CashierReportPaymentDto
                {
                    PaymentMethod = reader.GetString(0),
                    TransactionCount = reader.GetInt32(1),
                    Total = reader.GetDecimal(2)
                });
            }
        }

        var cashierMap = new Dictionary<int, CashierReportCashierSummaryDto>();
        foreach (var shift in shifts)
        {
            if (!cashierMap.TryGetValue(shift.UserId, out var summary))
            {
                summary = new CashierReportCashierSummaryDto
                {
                    UserId = shift.UserId,
                    CashierName = shift.CashierName
                };
                cashierMap[shift.UserId] = summary;
            }

            summary.ShiftCount += 1;
            summary.TransactionCount += shift.TransactionCount;
            summary.TotalSales += shift.TotalSales;
            summary.CashSales += shift.CashSales;
        }

        var totalSales = shifts.Sum(s => s.TotalSales);
        var totalCash = shifts.Sum(s => s.CashSales);
        var totalNonCash = shifts.Sum(s => s.NonCashSales);

        return new CashierReportResponseDto
        {
            Shifts = shifts,
            CashierSummaries = cashierMap.Values.OrderBy(c => c.CashierName).ToList(),
            Transactions = transactions,
            PaymentBreakdown = paymentBreakdown,
            TotalShiftCount = shifts.Count,
            OpenShiftCount = shifts.Count(s => s.IsOpen),
            TotalSales = totalSales,
            TotalCashSales = totalCash,
            TotalNonCashSales = totalNonCash
        };
    }

    private static CashierShiftListItemDto MapListItem(SqlDataReader reader) =>
        new()
        {
            Id = reader.GetInt64(0),
            UserId = reader.GetInt32(1),
            UserFullName = reader.IsDBNull(2) ? "" : reader.GetString(2),
            Username = reader.IsDBNull(3) ? "" : reader.GetString(3),
            OpenTime = reader.GetDateTime(4),
            CloseTime = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
            OpeningCash = reader.IsDBNull(6) ? null : reader.GetDecimal(6),
            ClosingCash = reader.IsDBNull(7) ? null : reader.GetDecimal(7)
        };
}
