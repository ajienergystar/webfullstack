using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class RefundRepository : IRefundRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public RefundRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<RefundListResponseDto> GetListAsync(string? invoiceNumber = null)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var list = new List<RefundListItemDto>();
        decimal total = 0;

        var sql = @"
            SELECT R.Id, R.RefundNumber, R.RefundDate, S.InvoiceNumber,
                   ISNULL(C.CustomerName, 'Walk-in'), ISNULL(U.FullName, ''),
                   ISNULL(O.OutletName, ''), R.TotalRefund, R.RefundMethod, R.Reason,
                   (SELECT COUNT(1) FROM RefundDetails D WHERE D.RefundId = R.Id)
            FROM Refunds R
            INNER JOIN SalesTransactions S ON R.SalesTransactionId = S.Id
            LEFT JOIN Customers C ON S.CustomerId = C.Id
            LEFT JOIN Users U ON R.UserId = U.Id
            LEFT JOIN Outlets O ON R.OutletId = O.Id
            WHERE R.Status = 'COMPLETED'";

        if (!string.IsNullOrWhiteSpace(invoiceNumber))
        {
            sql += " AND S.InvoiceNumber LIKE @invoice";
        }

        sql += " ORDER BY R.RefundDate DESC";

        await using var cmd = new SqlCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(invoiceNumber))
        {
            cmd.Parameters.AddWithValue("@invoice", $"%{invoiceNumber.Trim()}%");
        }

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var amount = reader.GetDecimal(7);
            total += amount;
            list.Add(new RefundListItemDto
            {
                Id = reader.GetInt64(0),
                RefundNumber = reader.GetString(1),
                RefundDate = reader.GetDateTime(2),
                InvoiceNumber = reader.GetString(3),
                CustomerName = reader.GetString(4),
                CashierName = reader.GetString(5),
                OutletName = reader.GetString(6),
                TotalRefund = amount,
                RefundMethod = reader.GetString(8),
                Reason = reader.IsDBNull(9) ? null : reader.GetString(9),
                ItemCount = reader.GetInt32(10)
            });
        }

        return new RefundListResponseDto
        {
            Refunds = list,
            TotalCount = list.Count,
            TotalRefundAmount = total
        };
    }

    public Task<SaleForRefundDto?> GetSaleForRefundByInvoiceAsync(string invoiceNumber)
        => LoadSaleForRefundAsync(invoiceNumber: invoiceNumber);

    public Task<SaleForRefundDto?> GetSaleForRefundAsync(long salesTransactionId)
        => LoadSaleForRefundAsync(salesId: salesTransactionId);

    private async Task<SaleForRefundDto?> LoadSaleForRefundAsync(
        long? salesId = null, string? invoiceNumber = null)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        SaleForRefundDto? sale = null;

        var where = salesId.HasValue ? "S.Id = @id" : "S.InvoiceNumber = @invoice";

        await using (var cmd = new SqlCommand($@"
            SELECT TOP 1
                S.Id, S.InvoiceNumber, S.TransactionDate, S.CustomerId,
                ISNULL(C.CustomerName, 'Walk-in'), S.UserId, S.OutletId,
                ISNULL(O.OutletName, ''), S.GrandTotal, S.PaymentMethod
            FROM SalesTransactions S
            LEFT JOIN Customers C ON S.CustomerId = C.Id
            LEFT JOIN Outlets O ON S.OutletId = O.Id
            WHERE {where}
            ORDER BY S.TransactionDate DESC", connection))
        {
            if (salesId.HasValue)
                cmd.Parameters.AddWithValue("@id", salesId.Value);
            else
                cmd.Parameters.AddWithValue("@invoice", invoiceNumber!);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            sale = new SaleForRefundDto
            {
                SalesTransactionId = reader.GetInt64(0),
                InvoiceNumber = reader.GetString(1),
                TransactionDate = reader.GetDateTime(2),
                CustomerId = reader.IsDBNull(3) ? null : reader.GetInt32(3),
                CustomerName = reader.GetString(4),
                UserId = reader.GetInt32(5),
                OutletId = reader.GetInt32(6),
                OutletName = reader.GetString(7),
                GrandTotal = reader.GetDecimal(8),
                PaymentMethod = reader.IsDBNull(9) ? "" : reader.GetString(9)
            };
        }

        var lines = new List<SaleLineForRefundDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT
                D.Id, D.ProductId, P.ProductCode, P.ProductName, P.Unit,
                D.Qty,
                ISNULL((
                    SELECT SUM(RD.Qty)
                    FROM RefundDetails RD
                    INNER JOIN Refunds R ON RD.RefundId = R.Id
                    WHERE RD.SalesTransactionDetailId = D.Id AND R.Status = 'COMPLETED'
                ), 0) AS RefundedQty,
                D.Price
            FROM SalesTransactionDetails D
            INNER JOIN Products P ON D.ProductId = P.Id
            WHERE D.SalesTransactionId = @salesId
            ORDER BY D.Id", connection))
        {
            cmd.Parameters.AddWithValue("@salesId", sale!.SalesTransactionId);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var soldQty = reader.GetInt32(5);
                var refundedQty = reader.GetInt32(6);
                lines.Add(new SaleLineForRefundDto
                {
                    SalesDetailId = reader.GetInt64(0),
                    ProductId = reader.GetInt32(1),
                    ProductCode = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ProductName = reader.GetString(3),
                    Unit = reader.IsDBNull(4) ? null : reader.GetString(4),
                    SoldQty = soldQty,
                    RefundedQty = refundedQty,
                    AvailableQty = soldQty - refundedQty,
                    Price = reader.GetDecimal(7)
                });
            }
        }

        sale.Lines = lines;
        return sale;
    }

    public async Task<RefundDetailDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        RefundDetailDto? header = null;

        await using (var cmd = new SqlCommand(@"
            SELECT R.Id, R.RefundNumber, R.RefundDate, S.InvoiceNumber,
                   ISNULL(C.CustomerName, 'Walk-in'), ISNULL(U.FullName, ''),
                   ISNULL(O.OutletName, ''), R.TotalRefund, R.RefundMethod, R.Reason
            FROM Refunds R
            INNER JOIN SalesTransactions S ON R.SalesTransactionId = S.Id
            LEFT JOIN Customers C ON S.CustomerId = C.Id
            LEFT JOIN Users U ON R.UserId = U.Id
            LEFT JOIN Outlets O ON R.OutletId = O.Id
            WHERE R.Id = @id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            header = new RefundDetailDto
            {
                Id = reader.GetInt64(0),
                RefundNumber = reader.GetString(1),
                RefundDate = reader.GetDateTime(2),
                InvoiceNumber = reader.GetString(3),
                CustomerName = reader.GetString(4),
                CashierName = reader.GetString(5),
                OutletName = reader.GetString(6),
                TotalRefund = reader.GetDecimal(7),
                RefundMethod = reader.GetString(8),
                Reason = reader.IsDBNull(9) ? null : reader.GetString(9)
            };
        }

        var items = new List<RefundDetailItemDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT RD.Id, P.ProductCode, P.ProductName, RD.Qty, RD.Price, RD.Total
            FROM RefundDetails RD
            INNER JOIN Products P ON RD.ProductId = P.Id
            WHERE RD.RefundId = @id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                items.Add(new RefundDetailItemDto
                {
                    DetailId = reader.GetInt64(0),
                    ProductCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    ProductName = reader.GetString(2),
                    Qty = reader.GetInt32(3),
                    Price = reader.GetDecimal(4),
                    Total = reader.GetDecimal(5)
                });
            }
        }

        header!.Items = items;
        return header;
    }

    public async Task<CreateRefundResponseDto> CreateAsync(CreateRefundRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var sale = await LoadSaleForRefundInTransactionAsync(
                connection, transaction, request.SalesTransactionId);
            if (sale is null)
            {
                throw new InvalidOperationException("Transaksi penjualan tidak ditemukan.");
            }

            ValidateRefundItems(sale, request.Items);

            var subTotal = request.Items.Sum(i => i.Qty * i.Price);
            var refundNumber = await GenerateRefundNumberAsync(connection, transaction);

            var refundId = await InsertRefundAsync(
                connection, transaction, request, refundNumber, subTotal);

            foreach (var item in request.Items)
            {
                var lineTotal = item.Qty * item.Price;
                await InsertRefundDetailAsync(connection, transaction, refundId, item, lineTotal);
                await UpdateStockAsync(connection, transaction, item.ProductId, item.Qty);
                await InsertStockMovementAsync(connection, transaction, item.ProductId, item.Qty, refundNumber);
            }

            await InsertAuditAsync(connection, transaction, request.UserId, refundId,
                $"Create refund {refundNumber} for {sale.InvoiceNumber}");

            await transaction.CommitAsync();

            return new CreateRefundResponseDto
            {
                Id = refundId,
                RefundNumber = refundNumber,
                TotalRefund = subTotal,
                RefundDate = DateTime.UtcNow
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static async Task<SaleForRefundDto?> LoadSaleForRefundInTransactionAsync(
        SqlConnection connection, SqlTransaction transaction, long salesId)
    {
        SaleForRefundDto? sale = null;

        await using (var cmd = new SqlCommand(@"
            SELECT S.Id, S.InvoiceNumber FROM SalesTransactions S WHERE S.Id = @id",
            connection, transaction))
        {
            cmd.Parameters.AddWithValue("@id", salesId);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;
            sale = new SaleForRefundDto
            {
                SalesTransactionId = reader.GetInt64(0),
                InvoiceNumber = reader.GetString(1)
            };
        }

        var lines = new List<SaleLineForRefundDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT D.Id, D.ProductId, D.Qty,
                ISNULL((
                    SELECT SUM(RD.Qty)
                    FROM RefundDetails RD
                    INNER JOIN Refunds R ON RD.RefundId = R.Id
                    WHERE RD.SalesTransactionDetailId = D.Id AND R.Status = 'COMPLETED'
                ), 0), D.Price
            FROM SalesTransactionDetails D
            WHERE D.SalesTransactionId = @salesId", connection, transaction))
        {
            cmd.Parameters.AddWithValue("@salesId", salesId);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var soldQty = reader.GetInt32(2);
                var refundedQty = reader.GetInt32(3);
                lines.Add(new SaleLineForRefundDto
                {
                    SalesDetailId = reader.GetInt64(0),
                    ProductId = reader.GetInt32(1),
                    SoldQty = soldQty,
                    RefundedQty = refundedQty,
                    AvailableQty = soldQty - refundedQty,
                    Price = reader.GetDecimal(4)
                });
            }
        }

        sale!.Lines = lines;
        return sale;
    }

    private static void ValidateRefundItems(SaleForRefundDto sale, List<CreateRefundItemDto> items)
    {
        var lineMap = sale.Lines.ToDictionary(l => l.SalesDetailId);
        var requested = items.GroupBy(i => i.SalesDetailId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Qty));

        foreach (var (detailId, qty) in requested)
        {
            if (!lineMap.TryGetValue(detailId, out var line))
            {
                throw new InvalidOperationException($"Baris transaksi {detailId} tidak valid.");
            }

            if (qty > line.AvailableQty)
            {
                throw new InvalidOperationException(
                    $"Qty refund melebihi sisa untuk {line.ProductName} (tersedia: {line.AvailableQty}, diminta: {qty}).");
            }
        }
    }

    private static async Task<string> GenerateRefundNumberAsync(
        SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(@"
            SELECT COUNT(1) + 1 FROM Refunds
            WHERE CAST(RefundDate AS DATE) = CAST(SYSUTCDATETIME() AS DATE)", connection, transaction);
        var seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"RFN-{DateTime.UtcNow:yyyyMMdd}-{seq:D3}";
    }

    private static async Task<long> InsertRefundAsync(
        SqlConnection connection, SqlTransaction transaction,
        CreateRefundRequestDto request, string refundNumber, decimal subTotal)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO Refunds
            (RefundNumber, SalesTransactionId, UserId, OutletId, SubTotal, TotalRefund, Reason, RefundMethod, Status)
            OUTPUT INSERTED.Id
            VALUES (@num, @salesId, @userId, @outletId, @subTotal, @total, @reason, @method, 'COMPLETED')",
            connection, transaction);

        cmd.Parameters.AddWithValue("@num", refundNumber);
        cmd.Parameters.AddWithValue("@salesId", request.SalesTransactionId);
        cmd.Parameters.AddWithValue("@userId", request.UserId);
        cmd.Parameters.AddWithValue("@outletId", request.OutletId);
        cmd.Parameters.AddWithValue("@subTotal", subTotal);
        cmd.Parameters.AddWithValue("@total", subTotal);
        cmd.Parameters.AddWithValue("@reason", (object?)request.Reason ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@method", request.RefundMethod);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private static async Task InsertRefundDetailAsync(
        SqlConnection connection, SqlTransaction transaction,
        long refundId, CreateRefundItemDto item, decimal lineTotal)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO RefundDetails
            (RefundId, SalesTransactionDetailId, ProductId, Qty, Price, Total)
            VALUES (@refundId, @detailId, @productId, @qty, @price, @total)", connection, transaction);

        cmd.Parameters.AddWithValue("@refundId", refundId);
        cmd.Parameters.AddWithValue("@detailId", item.SalesDetailId);
        cmd.Parameters.AddWithValue("@productId", item.ProductId);
        cmd.Parameters.AddWithValue("@qty", item.Qty);
        cmd.Parameters.AddWithValue("@price", item.Price);
        cmd.Parameters.AddWithValue("@total", lineTotal);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task UpdateStockAsync(
        SqlConnection connection, SqlTransaction transaction, int productId, int qty)
    {
        await using var cmd = new SqlCommand(
            "UPDATE Products SET Stock = Stock + @qty WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@id", productId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertStockMovementAsync(
        SqlConnection connection, SqlTransaction transaction,
        int productId, int qty, string referenceNumber)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO StockMovements (ProductId, MovementType, Qty, ReferenceNumber)
            VALUES (@productId, 'IN', @qty, @ref)", connection, transaction);

        cmd.Parameters.AddWithValue("@productId", productId);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@ref", referenceNumber);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertAuditAsync(
        SqlConnection connection, SqlTransaction transaction,
        int userId, long recordId, string action)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO AuditLogs (UserId, Action, TableName, RecordId)
            VALUES (@userId, @action, 'Refunds', @recordId)", connection, transaction);

        cmd.Parameters.AddWithValue("@userId", userId);
        cmd.Parameters.AddWithValue("@action", action);
        cmd.Parameters.AddWithValue("@recordId", recordId);
        await cmd.ExecuteNonQueryAsync();
    }
}
