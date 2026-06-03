using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class HoldRepository : IHoldRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public HoldRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<HoldListResponseDto> GetActiveHoldsAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var holds = new List<HoldListItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT
                H.Id, H.HoldNumber, H.HeldAt,
                ISNULL(C.CustomerName, 'Walk-in'),
                ISNULL(U.FullName, ''),
                ISNULL(O.OutletName, ''),
                H.GrandTotal, H.Status, H.Notes,
                (SELECT COUNT(1) FROM HeldTransactionDetails D WHERE D.HeldTransactionId = H.Id)
            FROM HeldTransactions H
            LEFT JOIN Customers C ON H.CustomerId = C.Id
            LEFT JOIN Users U ON H.UserId = U.Id
            LEFT JOIN Outlets O ON H.OutletId = O.Id
            WHERE H.Status = 'HOLD'
            ORDER BY H.HeldAt DESC", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            holds.Add(new HoldListItemDto
            {
                Id = reader.GetInt64(0),
                HoldNumber = reader.GetString(1),
                HeldAt = reader.GetDateTime(2),
                CustomerName = reader.GetString(3),
                CashierName = reader.GetString(4),
                OutletName = reader.GetString(5),
                GrandTotal = reader.GetDecimal(6),
                Status = reader.GetString(7),
                Notes = reader.IsDBNull(8) ? null : reader.GetString(8),
                ItemCount = reader.GetInt32(9)
            });
        }

        return new HoldListResponseDto { Holds = holds, TotalCount = holds.Count };
    }

    public async Task<HoldDetailDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        HoldDetailDto? header = null;

        await using (var cmd = new SqlCommand(@"
            SELECT H.Id, H.HoldNumber, H.HeldAt, H.CustomerId,
                   ISNULL(C.CustomerName, 'Walk-in'),
                   H.UserId, ISNULL(U.FullName, ''),
                   H.OutletId, ISNULL(O.OutletName, ''),
                   H.SubTotal, H.Discount, H.Tax, H.GrandTotal, H.Notes, H.Status
            FROM HeldTransactions H
            LEFT JOIN Customers C ON H.CustomerId = C.Id
            LEFT JOIN Users U ON H.UserId = U.Id
            LEFT JOIN Outlets O ON H.OutletId = O.Id
            WHERE H.Id = @id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            header = new HoldDetailDto
            {
                Id = reader.GetInt64(0),
                HoldNumber = reader.GetString(1),
                HeldAt = reader.GetDateTime(2),
                CustomerId = reader.IsDBNull(3) ? null : reader.GetInt32(3),
                CustomerName = reader.GetString(4),
                UserId = reader.GetInt32(5),
                CashierName = reader.GetString(6),
                OutletId = reader.GetInt32(7),
                OutletName = reader.GetString(8),
                SubTotal = reader.GetDecimal(9),
                Discount = reader.GetDecimal(10),
                Tax = reader.GetDecimal(11),
                GrandTotal = reader.GetDecimal(12),
                Notes = reader.IsDBNull(13) ? null : reader.GetString(13),
                Status = reader.GetString(14)
            };
        }

        var items = new List<HoldDetailItemDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT D.Id, D.ProductId, P.ProductCode, P.ProductName, P.Unit, P.Stock,
                   D.Qty, D.Price, D.Discount, D.Total
            FROM HeldTransactionDetails D
            INNER JOIN Products P ON D.ProductId = P.Id
            WHERE D.HeldTransactionId = @id
            ORDER BY D.Id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                items.Add(new HoldDetailItemDto
                {
                    DetailId = reader.GetInt64(0),
                    ProductId = reader.GetInt32(1),
                    ProductCode = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ProductName = reader.GetString(3),
                    Unit = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Stock = reader.GetInt32(5),
                    Qty = reader.GetInt32(6),
                    Price = reader.GetDecimal(7),
                    Discount = reader.GetDecimal(8),
                    Total = reader.GetDecimal(9)
                });
            }
        }

        header!.Items = items;
        return header;
    }

    public async Task<CreateHoldResponseDto> CreateAsync(CreateHoldRequestDto request)
    {
        var subTotal = request.Items.Sum(i => i.Qty * i.Price - i.Discount);
        var grandTotal = subTotal - request.Discount + request.Tax;

        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var holdNumber = await GenerateHoldNumberAsync(connection, transaction);
            var holdId = await InsertHoldAsync(connection, transaction, request, holdNumber, subTotal, grandTotal);
            await InsertHoldDetailsAsync(connection, transaction, holdId, request.Items);
            await InsertAuditAsync(connection, transaction, request.UserId, holdId, $"Create hold {holdNumber}");

            await transaction.CommitAsync();
            return new CreateHoldResponseDto
            {
                Id = holdId,
                HoldNumber = holdNumber,
                GrandTotal = grandTotal,
                HeldAt = DateTime.UtcNow
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<CreateHoldResponseDto> UpdateAsync(long id, UpdateHoldRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var status = await GetHoldStatusAsync(connection, transaction, id);
            if (status != "HOLD")
            {
                throw new InvalidOperationException("Hanya transaksi berstatus HOLD yang dapat diubah.");
            }

            var subTotal = request.Items.Sum(i => i.Qty * i.Price - i.Discount);
            var grandTotal = subTotal - request.Discount + request.Tax;

            await using (var cmd = new SqlCommand(@"
                UPDATE HeldTransactions SET
                    CustomerId = @customerId, UserId = @userId, OutletId = @outletId,
                    SubTotal = @subTotal, Discount = @discount, Tax = @tax,
                    GrandTotal = @grandTotal, Notes = @notes
                WHERE Id = @id", connection, transaction))
            {
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@customerId", (object?)request.CustomerId ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@userId", request.UserId);
                cmd.Parameters.AddWithValue("@outletId", request.OutletId);
                cmd.Parameters.AddWithValue("@subTotal", subTotal);
                cmd.Parameters.AddWithValue("@discount", request.Discount);
                cmd.Parameters.AddWithValue("@tax", request.Tax);
                cmd.Parameters.AddWithValue("@grandTotal", grandTotal);
                cmd.Parameters.AddWithValue("@notes", (object?)request.Notes ?? DBNull.Value);
                await cmd.ExecuteNonQueryAsync();
            }

            await using (var cmd = new SqlCommand(
                "DELETE FROM HeldTransactionDetails WHERE HeldTransactionId = @id", connection, transaction))
            {
                cmd.Parameters.AddWithValue("@id", id);
                await cmd.ExecuteNonQueryAsync();
            }

            await InsertHoldDetailsAsync(connection, transaction, id, request.Items);

            var holdNumber = await GetHoldNumberAsync(connection, transaction, id);
            await InsertAuditAsync(connection, transaction, request.UserId, id, $"Update hold {holdNumber}");

            await transaction.CommitAsync();
            return new CreateHoldResponseDto
            {
                Id = id,
                HoldNumber = holdNumber,
                GrandTotal = grandTotal,
                HeldAt = DateTime.UtcNow
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task CancelAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var status = await GetHoldStatusAsync(connection, null, id);
        if (status != "HOLD")
        {
            throw new InvalidOperationException("Hanya transaksi berstatus HOLD yang dapat dibatalkan.");
        }

        await using var cmd = new SqlCommand(
            "UPDATE HeldTransactions SET Status = 'CANCELLED' WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<CompleteHoldResponseDto> CompleteAsync(long id, CompleteHoldRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var hold = await GetHoldForCompleteAsync(connection, transaction, id);
            if (hold.Status != "HOLD")
            {
                throw new InvalidOperationException("Transaksi hold sudah tidak aktif.");
            }

            if (request.PaidAmount < hold.GrandTotal)
            {
                throw new InvalidOperationException("Jumlah bayar kurang dari total.");
            }

            await ValidateStockForItemsAsync(connection, transaction, hold.Items);

            var changeAmount = request.PaidAmount - hold.GrandTotal;
            var invoiceNumber = await GenerateInvoiceNumberAsync(connection, transaction);

            var salesId = await InsertSaleFromHoldAsync(
                connection, transaction, hold, invoiceNumber, request, changeAmount);

            foreach (var item in hold.Items)
            {
                await InsertSaleDetailAsync(connection, transaction, salesId, item);
                await UpdateStockAsync(connection, transaction, item.ProductId, item.Qty);
                await InsertStockMovementAsync(connection, transaction, item.ProductId, item.Qty, invoiceNumber);
            }

            await using (var cmd = new SqlCommand(@"
                UPDATE HeldTransactions SET
                    Status = 'COMPLETED',
                    CompletedSalesId = @salesId,
                    CompletedAt = SYSUTCDATETIME()
                WHERE Id = @id", connection, transaction))
            {
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@salesId", salesId);
                await cmd.ExecuteNonQueryAsync();
            }

            await InsertAuditAsync(connection, transaction, hold.UserId, salesId,
                $"Complete hold {hold.HoldNumber} -> {invoiceNumber}");

            await transaction.CommitAsync();

            return new CompleteHoldResponseDto
            {
                HoldId = id,
                HoldNumber = hold.HoldNumber,
                SalesId = salesId,
                InvoiceNumber = invoiceNumber,
                GrandTotal = hold.GrandTotal,
                ChangeAmount = changeAmount
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private sealed class HoldCompleteData
    {
        public string HoldNumber { get; set; } = "";
        public string Status { get; set; } = "";
        public int? CustomerId { get; set; }
        public int UserId { get; set; }
        public int OutletId { get; set; }
        public decimal SubTotal { get; set; }
        public decimal Discount { get; set; }
        public decimal Tax { get; set; }
        public decimal GrandTotal { get; set; }
        public List<CreateHoldItemDto> Items { get; set; } = [];
    }

    private static async Task<HoldCompleteData> GetHoldForCompleteAsync(
        SqlConnection connection, SqlTransaction transaction, long id)
    {
        HoldCompleteData? hold = null;

        await using (var cmd = new SqlCommand(@"
            SELECT HoldNumber, Status, CustomerId, UserId, OutletId,
                   SubTotal, Discount, Tax, GrandTotal
            FROM HeldTransactions WHERE Id = @id", connection, transaction))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                throw new InvalidOperationException("Hold transaksi tidak ditemukan.");
            }

            hold = new HoldCompleteData
            {
                HoldNumber = reader.GetString(0),
                Status = reader.GetString(1),
                CustomerId = reader.IsDBNull(2) ? null : reader.GetInt32(2),
                UserId = reader.GetInt32(3),
                OutletId = reader.GetInt32(4),
                SubTotal = reader.GetDecimal(5),
                Discount = reader.GetDecimal(6),
                Tax = reader.GetDecimal(7),
                GrandTotal = reader.GetDecimal(8)
            };
        }

        var items = new List<CreateHoldItemDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT ProductId, Qty, Price, Discount
            FROM HeldTransactionDetails WHERE HeldTransactionId = @id", connection, transaction))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                items.Add(new CreateHoldItemDto
                {
                    ProductId = reader.GetInt32(0),
                    Qty = reader.GetInt32(1),
                    Price = reader.GetDecimal(2),
                    Discount = reader.GetDecimal(3)
                });
            }
        }

        hold!.Items = items;
        return hold;
    }

    private static async Task ValidateStockForItemsAsync(
        SqlConnection connection, SqlTransaction transaction, List<CreateHoldItemDto> items)
    {
        var required = items.GroupBy(i => i.ProductId).ToDictionary(g => g.Key, g => g.Sum(x => x.Qty));
        foreach (var (productId, qty) in required)
        {
            await using var cmd = new SqlCommand(
                "SELECT Stock FROM Products WHERE Id = @id AND IsActive = 1", connection, transaction);
            cmd.Parameters.AddWithValue("@id", productId);
            var result = await cmd.ExecuteScalarAsync();
            if (result is null)
            {
                throw new InvalidOperationException($"Produk ID {productId} tidak ditemukan.");
            }
            var stock = Convert.ToInt32(result);
            if (stock < qty)
            {
                throw new InvalidOperationException(
                    $"Stok produk ID {productId} tidak mencukupi (tersedia: {stock}, diminta: {qty}).");
            }
        }
    }

    private static async Task<string> GenerateHoldNumberAsync(SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(@"
            SELECT COUNT(1) + 1 FROM HeldTransactions
            WHERE CAST(HeldAt AS DATE) = CAST(SYSUTCDATETIME() AS DATE)", connection, transaction);
        var seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"HOLD-{DateTime.UtcNow:yyyyMMdd}-{seq:D3}";
    }

    private static async Task<string> GenerateInvoiceNumberAsync(SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(@"
            SELECT COUNT(1) + 1 FROM SalesTransactions
            WHERE CAST(TransactionDate AS DATE) = CAST(SYSUTCDATETIME() AS DATE)", connection, transaction);
        var seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"INV-{DateTime.UtcNow:yyyyMMdd}-{seq:D3}";
    }

    private static async Task<long> InsertHoldAsync(
        SqlConnection connection, SqlTransaction transaction,
        CreateHoldRequestDto request, string holdNumber, decimal subTotal, decimal grandTotal)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO HeldTransactions
            (HoldNumber, CustomerId, UserId, OutletId, SubTotal, Discount, Tax, GrandTotal, Notes, Status)
            OUTPUT INSERTED.Id
            VALUES (@holdNumber, @customerId, @userId, @outletId, @subTotal, @discount, @tax, @grandTotal, @notes, 'HOLD')",
            connection, transaction);

        cmd.Parameters.AddWithValue("@holdNumber", holdNumber);
        cmd.Parameters.AddWithValue("@customerId", (object?)request.CustomerId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@userId", request.UserId);
        cmd.Parameters.AddWithValue("@outletId", request.OutletId);
        cmd.Parameters.AddWithValue("@subTotal", subTotal);
        cmd.Parameters.AddWithValue("@discount", request.Discount);
        cmd.Parameters.AddWithValue("@tax", request.Tax);
        cmd.Parameters.AddWithValue("@grandTotal", grandTotal);
        cmd.Parameters.AddWithValue("@notes", (object?)request.Notes ?? DBNull.Value);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private static async Task InsertHoldDetailsAsync(
        SqlConnection connection, SqlTransaction transaction, long holdId, List<CreateHoldItemDto> items)
    {
        foreach (var item in items)
        {
            var lineTotal = item.Qty * item.Price - item.Discount;
            await using var cmd = new SqlCommand(@"
                INSERT INTO HeldTransactionDetails
                (HeldTransactionId, ProductId, Qty, Price, Discount, Total)
                VALUES (@holdId, @productId, @qty, @price, @discount, @total)", connection, transaction);

            cmd.Parameters.AddWithValue("@holdId", holdId);
            cmd.Parameters.AddWithValue("@productId", item.ProductId);
            cmd.Parameters.AddWithValue("@qty", item.Qty);
            cmd.Parameters.AddWithValue("@price", item.Price);
            cmd.Parameters.AddWithValue("@discount", item.Discount);
            cmd.Parameters.AddWithValue("@total", lineTotal);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    private static async Task<long> InsertSaleFromHoldAsync(
        SqlConnection connection, SqlTransaction transaction,
        HoldCompleteData hold, string invoiceNumber,
        CompleteHoldRequestDto request, decimal changeAmount)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO SalesTransactions
            (InvoiceNumber, CustomerId, UserId, OutletId, SubTotal, Discount, Tax,
             GrandTotal, PaymentMethod, PaidAmount, ChangeAmount)
            OUTPUT INSERTED.Id
            VALUES (@invoice, @customerId, @userId, @outletId, @subTotal, @discount, @tax,
                    @grandTotal, @paymentMethod, @paidAmount, @changeAmount)", connection, transaction);

        cmd.Parameters.AddWithValue("@invoice", invoiceNumber);
        cmd.Parameters.AddWithValue("@customerId", (object?)hold.CustomerId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@userId", hold.UserId);
        cmd.Parameters.AddWithValue("@outletId", hold.OutletId);
        cmd.Parameters.AddWithValue("@subTotal", hold.SubTotal);
        cmd.Parameters.AddWithValue("@discount", hold.Discount);
        cmd.Parameters.AddWithValue("@tax", hold.Tax);
        cmd.Parameters.AddWithValue("@grandTotal", hold.GrandTotal);
        cmd.Parameters.AddWithValue("@paymentMethod", request.PaymentMethod);
        cmd.Parameters.AddWithValue("@paidAmount", request.PaidAmount);
        cmd.Parameters.AddWithValue("@changeAmount", changeAmount);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private static async Task InsertSaleDetailAsync(
        SqlConnection connection, SqlTransaction transaction, long salesId, CreateHoldItemDto item)
    {
        var lineTotal = item.Qty * item.Price - item.Discount;
        await using var cmd = new SqlCommand(@"
            INSERT INTO SalesTransactionDetails
            (SalesTransactionId, ProductId, Qty, Price, Discount, Total)
            VALUES (@salesId, @productId, @qty, @price, @discount, @total)", connection, transaction);

        cmd.Parameters.AddWithValue("@salesId", salesId);
        cmd.Parameters.AddWithValue("@productId", item.ProductId);
        cmd.Parameters.AddWithValue("@qty", item.Qty);
        cmd.Parameters.AddWithValue("@price", item.Price);
        cmd.Parameters.AddWithValue("@discount", item.Discount);
        cmd.Parameters.AddWithValue("@total", lineTotal);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task UpdateStockAsync(
        SqlConnection connection, SqlTransaction transaction, int productId, int qty)
    {
        await using var cmd = new SqlCommand(
            "UPDATE Products SET Stock = Stock - @qty WHERE Id = @id", connection, transaction);
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
            VALUES (@productId, 'OUT', @qty, @ref)", connection, transaction);

        cmd.Parameters.AddWithValue("@productId", productId);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@ref", referenceNumber);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertAuditAsync(
        SqlConnection connection, SqlTransaction? transaction, int userId, long recordId, string action)
    {
        await using var cmd = transaction is null
            ? new SqlCommand(@"
                INSERT INTO AuditLogs (UserId, Action, TableName, RecordId)
                VALUES (@userId, @action, 'HeldTransactions', @recordId)", connection)
            : new SqlCommand(@"
                INSERT INTO AuditLogs (UserId, Action, TableName, RecordId)
                VALUES (@userId, @action, 'HeldTransactions', @recordId)", connection, transaction);

        cmd.Parameters.AddWithValue("@userId", userId);
        cmd.Parameters.AddWithValue("@action", action);
        cmd.Parameters.AddWithValue("@recordId", recordId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<string> GetHoldStatusAsync(
        SqlConnection connection, SqlTransaction? transaction, long id)
    {
        await using var cmd = transaction is null
            ? new SqlCommand("SELECT Status FROM HeldTransactions WHERE Id = @id", connection)
            : new SqlCommand("SELECT Status FROM HeldTransactions WHERE Id = @id", connection, transaction);

        cmd.Parameters.AddWithValue("@id", id);
        var result = await cmd.ExecuteScalarAsync();
        if (result is null) throw new InvalidOperationException("Hold transaksi tidak ditemukan.");
        return result.ToString()!;
    }

    private static async Task<string> GetHoldNumberAsync(
        SqlConnection connection, SqlTransaction transaction, long id)
    {
        await using var cmd = new SqlCommand(
            "SELECT HoldNumber FROM HeldTransactions WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", id);
        return (await cmd.ExecuteScalarAsync())?.ToString() ?? "";
    }
}
