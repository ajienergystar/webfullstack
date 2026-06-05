using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private const int LowStockThreshold = 10;

    private readonly IPosSqlConnectionFactory _connectionFactory;

    public NotificationRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<NotificationListResponseDto> GetAllAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var items = new List<NotificationItemDto>();
        items.AddRange(await LoadLowStockAsync(connection));
        items.AddRange(await LoadHutangPiutangAsync(connection));
        items.AddRange(await LoadOpenShiftsAsync(connection));
        items.AddRange(await LoadExpiringVouchersAsync(connection));
        items.AddRange(await LoadExpiringMembershipsAsync(connection));
        items.AddRange(await LoadHeldTransactionsAsync(connection));
        items.AddRange(await LoadAuditLogsAsync(connection));

        var ordered = items
            .OrderByDescending(n => n.Severity == "danger")
            .ThenByDescending(n => n.Severity == "warning")
            .ThenByDescending(n => n.CreatedAt)
            .ToList();

        return new NotificationListResponseDto
        {
            Items = ordered,
            Summary = BuildSummary(ordered),
        };
    }

    private static NotificationSummaryDto BuildSummary(List<NotificationItemDto> items)
    {
        return new NotificationSummaryDto
        {
            Total = items.Count,
            Warning = items.Count(n => n.Severity == "warning"),
            Danger = items.Count(n => n.Severity == "danger"),
            Info = items.Count(n => n.Severity == "info"),
            Inventory = items.Count(n => n.Category == "inventory"),
            Finance = items.Count(n => n.Category == "finance"),
            System = items.Count(n => n.Category == "system"),
        };
    }

    private static async Task<List<NotificationItemDto>> LoadLowStockAsync(SqlConnection connection)
    {
        var list = new List<NotificationItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT Id, ProductName, Stock, Unit
            FROM Products
            WHERE IsActive = 1 AND Stock <= @threshold
            ORDER BY Stock ASC, ProductName", connection);
        cmd.Parameters.AddWithValue("@threshold", LowStockThreshold);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var id = reader.GetInt32(0);
            var name = reader.GetString(1);
            var stock = reader.GetInt32(2);
            var unit = reader.GetString(3);

            list.Add(new NotificationItemDto
            {
                Id = $"low-stock-{id}",
                Type = "LOW_STOCK",
                Category = "inventory",
                Severity = stock <= 5 ? "danger" : "warning",
                Title = "Stok Menipis",
                Message = $"{name} tersisa {stock} {unit}. Segera lakukan restock.",
                CreatedAt = DateTime.UtcNow,
                LinkPath = "/dashboard/master/stok",
                ReferenceId = id,
            });
        }

        return list;
    }

    private static async Task<List<NotificationItemDto>> LoadHutangPiutangAsync(SqlConnection connection)
    {
        var list = new List<NotificationItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT H.Id, H.ReferenceNumber, C.CustomerName, H.Type, H.Amount, H.PaidAmount,
                   H.Status, H.DueDate, H.RecordDate
            FROM CustomerHutangPiutang H
            INNER JOIN Customers C ON H.CustomerId = C.Id
            WHERE H.Status IN ('OPEN', 'PARTIAL')
            ORDER BY H.RecordDate DESC", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var id = reader.GetInt64(0);
            var reference = reader.GetString(1);
            var customer = reader.GetString(2);
            var type = reader.GetString(3);
            var amount = reader.GetDecimal(4);
            var paid = reader.GetDecimal(5);
            var status = reader.GetString(6);
            var dueDate = reader.IsDBNull(7) ? (DateTime?)null : reader.GetDateTime(7);
            var recordDate = reader.GetDateTime(8);
            var remaining = amount - paid;

            var isOverdue = dueDate.HasValue && dueDate.Value < DateTime.UtcNow;
            var typeLabel = type == "PIUTANG" ? "Piutang" : "Hutang";

            list.Add(new NotificationItemDto
            {
                Id = $"hutang-{id}",
                Type = "HUTANG_PIUTANG",
                Category = "finance",
                Severity = isOverdue ? "danger" : "warning",
                Title = $"{typeLabel} {status}",
                Message = $"{customer} — {reference}: sisa {remaining:N0} IDR" +
                          (dueDate.HasValue ? $" (jatuh tempo {dueDate.Value:dd MMM yyyy})" : ""),
                CreatedAt = recordDate,
                LinkPath = "/dashboard/finance/hutang",
                ReferenceId = id,
            });
        }

        return list;
    }

    private static async Task<List<NotificationItemDto>> LoadOpenShiftsAsync(SqlConnection connection)
    {
        var list = new List<NotificationItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT S.Id, U.FullName, S.OpenTime, S.OpeningCash
            FROM CashierShifts S
            INNER JOIN Users U ON S.UserId = U.Id
            WHERE S.ClosingCash IS NULL
            ORDER BY S.OpenTime DESC", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var id = reader.GetInt64(0);
            var cashier = reader.GetString(1);
            var openTime = reader.GetDateTime(2);
            var openingCash = reader.GetDecimal(3);

            list.Add(new NotificationItemDto
            {
                Id = $"shift-{id}",
                Type = "SHIFT_OPEN",
                Category = "system",
                Severity = "info",
                Title = "Shift Kasir Belum Ditutup",
                Message = $"{cashier} membuka shift pada {openTime:dd MMM yyyy HH:mm} dengan modal awal {openingCash:N0} IDR.",
                CreatedAt = openTime,
                LinkPath = "/dashboard/users/shift",
                ReferenceId = id,
            });
        }

        return list;
    }

    private static async Task<List<NotificationItemDto>> LoadExpiringVouchersAsync(SqlConnection connection)
    {
        var list = new List<NotificationItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT Id, VoucherCode, DiscountAmount, ExpiredDate
            FROM Vouchers
            WHERE IsActive = 1
              AND ExpiredDate <= DATEADD(DAY, 7, SYSUTCDATETIME())
            ORDER BY ExpiredDate ASC", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var id = reader.GetInt32(0);
            var code = reader.GetString(1);
            var discount = reader.GetDecimal(2);
            var expiredDate = reader.GetDateTime(3);
            var isExpired = expiredDate < DateTime.UtcNow;

            list.Add(new NotificationItemDto
            {
                Id = $"voucher-{id}",
                Type = "VOUCHER_EXPIRING",
                Category = "finance",
                Severity = isExpired ? "danger" : "warning",
                Title = isExpired ? "Voucher Kedaluwarsa" : "Voucher Segera Berakhir",
                Message = $"{code} — diskon {discount:N0} IDR, berlaku hingga {expiredDate:dd MMM yyyy}.",
                CreatedAt = expiredDate,
                LinkPath = "/dashboard/promo/voucher",
                ReferenceId = id,
            });
        }

        return list;
    }

    private static async Task<List<NotificationItemDto>> LoadExpiringMembershipsAsync(SqlConnection connection)
    {
        var list = new List<NotificationItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT M.Id, C.CustomerName, M.MemberCode, M.MemberLevel, M.ExpiredDate
            FROM Memberships M
            INNER JOIN Customers C ON M.CustomerId = C.Id
            WHERE M.IsActive = 1
              AND M.ExpiredDate <= DATEADD(DAY, 30, SYSUTCDATETIME())
            ORDER BY M.ExpiredDate ASC", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var id = reader.GetInt32(0);
            var customer = reader.GetString(1);
            var code = reader.GetString(2);
            var level = reader.GetString(3);
            var expiredDate = reader.GetDateTime(4);
            var isExpired = expiredDate < DateTime.UtcNow;

            list.Add(new NotificationItemDto
            {
                Id = $"membership-{id}",
                Type = "MEMBERSHIP_EXPIRING",
                Category = "system",
                Severity = isExpired ? "danger" : "info",
                Title = isExpired ? "Membership Berakhir" : "Membership Segera Berakhir",
                Message = $"{customer} ({code}) — level {level}, berlaku hingga {expiredDate:dd MMM yyyy}.",
                CreatedAt = expiredDate,
                LinkPath = "/dashboard/customer/membership",
                ReferenceId = id,
            });
        }

        return list;
    }

    private static async Task<List<NotificationItemDto>> LoadHeldTransactionsAsync(SqlConnection connection)
    {
        var list = new List<NotificationItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT H.Id, H.HoldNumber, ISNULL(C.CustomerName, 'Walk-in') AS CustomerName,
                   H.GrandTotal, H.HeldAt
            FROM HeldTransactions H
            LEFT JOIN Customers C ON H.CustomerId = C.Id
            WHERE H.Status = 'HOLD'
            ORDER BY H.HeldAt DESC", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var id = reader.GetInt64(0);
            var holdNumber = reader.GetString(1);
            var customer = reader.GetString(2);
            var total = reader.GetDecimal(3);
            var heldAt = reader.GetDateTime(4);

            list.Add(new NotificationItemDto
            {
                Id = $"hold-{id}",
                Type = "HOLD_TRANSACTION",
                Category = "inventory",
                Severity = "info",
                Title = "Transaksi Tertahan",
                Message = $"{holdNumber} — {customer}, total {total:N0} IDR menunggu dilanjutkan.",
                CreatedAt = heldAt,
                LinkPath = "/dashboard/pos/hold",
                ReferenceId = id,
            });
        }

        return list;
    }

    private static async Task<List<NotificationItemDto>> LoadAuditLogsAsync(SqlConnection connection)
    {
        var list = new List<NotificationItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT TOP 15
                A.Id, ISNULL(U.FullName, 'Sistem') AS UserName,
                A.Action, A.TableName, A.CreatedAt
            FROM AuditLogs A
            LEFT JOIN Users U ON A.UserId = U.Id
            ORDER BY A.CreatedAt DESC", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var id = reader.GetInt64(0);
            var userName = reader.GetString(1);
            var action = reader.GetString(2);
            var tableName = reader.IsDBNull(3) ? null : reader.GetString(3);
            var createdAt = reader.GetDateTime(4);

            list.Add(new NotificationItemDto
            {
                Id = $"audit-{id}",
                Type = "AUDIT_LOG",
                Category = "system",
                Severity = "info",
                Title = "Aktivitas Sistem",
                Message = $"{userName}: {action}" + (tableName != null ? $" ({tableName})" : ""),
                CreatedAt = createdAt,
                LinkPath = "/dashboard/modern/audit",
                ReferenceId = id,
            });
        }

        return list;
    }
}
