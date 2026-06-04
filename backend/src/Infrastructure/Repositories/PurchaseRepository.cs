using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class PurchaseRepository : IPurchaseRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public PurchaseRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<PurchaseFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var suppliers = new List<PurchaseSupplierOptionDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT Id, SupplierName FROM Suppliers ORDER BY SupplierName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                suppliers.Add(new PurchaseSupplierOptionDto
                {
                    Id = reader.GetInt32(0),
                    SupplierName = reader.IsDBNull(1) ? "" : reader.GetString(1)
                });
            }
        }

        var products = new List<PurchaseProductOptionDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT P.Id, P.ProductCode, P.ProductName, P.Barcode, C.CategoryName,
                   P.PurchasePrice, P.Stock, P.Unit
            FROM Products P
            LEFT JOIN Categories C ON P.CategoryId = C.Id
            WHERE P.IsActive = 1
            ORDER BY P.ProductName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                products.Add(new PurchaseProductOptionDto
                {
                    Id = reader.GetInt32(0),
                    ProductCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    ProductName = reader.GetString(2),
                    Barcode = reader.IsDBNull(3) ? null : reader.GetString(3),
                    CategoryName = reader.IsDBNull(4) ? null : reader.GetString(4),
                    PurchasePrice = reader.GetDecimal(5),
                    Stock = reader.GetInt32(6),
                    Unit = reader.IsDBNull(7) ? null : reader.GetString(7)
                });
            }
        }

        return new PurchaseFormDataDto { Suppliers = suppliers, Products = products };
    }

    public async Task<PurchaseListResponseDto> GetListAsync(
        string? search, DateTime? dateFrom, DateTime? dateTo, int? supplierId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(P.InvoiceNumber LIKE @search OR S.SupplierName LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (dateFrom.HasValue)
        {
            where.Add("P.PurchaseDate >= @dateFrom");
            cmd.Parameters.AddWithValue("@dateFrom", dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            where.Add("P.PurchaseDate < @dateTo");
            cmd.Parameters.AddWithValue("@dateTo", dateTo.Value);
        }

        if (supplierId is > 0)
        {
            where.Add("P.SupplierId = @supplierId");
            cmd.Parameters.AddWithValue("@supplierId", supplierId.Value);
        }

        cmd.CommandText = $@"
            SELECT P.Id, P.InvoiceNumber, P.SupplierId, S.SupplierName,
                   P.PurchaseDate, P.TotalAmount,
                   (SELECT COUNT(1) FROM PurchaseDetails D WHERE D.PurchaseId = P.Id) AS LineCount
            FROM Purchases P
            LEFT JOIN Suppliers S ON P.SupplierId = S.Id
            WHERE {string.Join(" AND ", where)}
            ORDER BY P.PurchaseDate DESC, P.Id DESC";

        var purchases = new List<PurchaseListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                purchases.Add(new PurchaseListItemDto
                {
                    Id = reader.GetInt64(0),
                    InvoiceNumber = reader.IsDBNull(1) ? null : reader.GetString(1),
                    SupplierId = reader.IsDBNull(2) ? null : reader.GetInt32(2),
                    SupplierName = reader.IsDBNull(3) ? null : reader.GetString(3),
                    PurchaseDate = reader.GetDateTime(4),
                    TotalAmount = reader.IsDBNull(5) ? null : reader.GetDecimal(5),
                    LineCount = reader.GetInt32(6)
                });
            }
        }

        return new PurchaseListResponseDto
        {
            Purchases = purchases,
            TotalCount = purchases.Count,
            TotalAmount = purchases.Sum(p => p.TotalAmount ?? 0)
        };
    }

    public async Task<PurchaseDetailResponseDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        PurchaseDetailResponseDto? header = null;
        await using (var cmd = new SqlCommand(@"
            SELECT P.Id, P.InvoiceNumber, P.SupplierId, S.SupplierName,
                   P.PurchaseDate, P.TotalAmount
            FROM Purchases P
            LEFT JOIN Suppliers S ON P.SupplierId = S.Id
            WHERE P.Id = @id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            header = new PurchaseDetailResponseDto
            {
                Id = reader.GetInt64(0),
                InvoiceNumber = reader.IsDBNull(1) ? null : reader.GetString(1),
                SupplierId = reader.IsDBNull(2) ? null : reader.GetInt32(2),
                SupplierName = reader.IsDBNull(3) ? null : reader.GetString(3),
                PurchaseDate = reader.GetDateTime(4),
                TotalAmount = reader.IsDBNull(5) ? null : reader.GetDecimal(5)
            };
        }

        var details = new List<PurchaseDetailLineDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT D.Id, D.ProductId, PR.ProductCode, PR.ProductName, PR.Unit,
                   D.Qty, D.Price, D.Total
            FROM PurchaseDetails D
            INNER JOIN Products PR ON D.ProductId = PR.Id
            WHERE D.PurchaseId = @id
            ORDER BY D.Id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                details.Add(new PurchaseDetailLineDto
                {
                    Id = reader.GetInt64(0),
                    ProductId = reader.GetInt32(1),
                    ProductCode = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ProductName = reader.GetString(3),
                    Unit = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Qty = reader.GetInt32(5),
                    Price = reader.GetDecimal(6),
                    Total = reader.GetDecimal(7)
                });
            }
        }

        header!.Details = details;
        return header;
    }

    public async Task<PurchaseMutationResponseDto> CreateAsync(CreatePurchaseRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var invoice = string.IsNullOrWhiteSpace(request.InvoiceNumber)
                ? await GenerateInvoiceNumberAsync(connection, transaction)
                : request.InvoiceNumber.Trim();

            if (await InvoiceExistsAsync(connection, transaction, invoice, null))
                throw new InvalidOperationException($"Nomor invoice '{invoice}' sudah dipakai.");

            var totalAmount = request.Items.Sum(i => i.Qty * i.Price);
            var purchaseId = await InsertPurchaseAsync(
                connection, transaction, invoice, request.SupplierId, request.PurchaseDate, totalAmount);

            foreach (var item in request.Items)
            {
                var lineTotal = item.Qty * item.Price;
                await InsertPurchaseDetailAsync(connection, transaction, purchaseId, item, lineTotal);
                await ApplyStockInAsync(connection, transaction, item.ProductId, item.Qty, invoice);
            }

            await transaction.CommitAsync();

            return new PurchaseMutationResponseDto
            {
                Id = purchaseId,
                InvoiceNumber = invoice,
                TotalAmount = totalAmount
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<PurchaseMutationResponseDto> UpdateAsync(long id, UpdatePurchaseRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var existing = await GetPurchaseHeaderAsync(connection, transaction, id)
                ?? throw new InvalidOperationException("Purchase order tidak ditemukan.");

            var invoice = string.IsNullOrWhiteSpace(request.InvoiceNumber)
                ? existing.InvoiceNumber ?? await GenerateInvoiceNumberAsync(connection, transaction)
                : request.InvoiceNumber.Trim();

            if (await InvoiceExistsAsync(connection, transaction, invoice, id))
                throw new InvalidOperationException($"Nomor invoice '{invoice}' sudah dipakai.");

            var oldDetails = await GetPurchaseDetailsAsync(connection, transaction, id);
            foreach (var old in oldDetails)
            {
                await ApplyStockOutAsync(
                    connection, transaction, old.ProductId, old.Qty, $"REV-{existing.InvoiceNumber}");
            }

            await DeletePurchaseDetailsAsync(connection, transaction, id);

            var totalAmount = request.Items.Sum(i => i.Qty * i.Price);
            await UpdatePurchaseHeaderAsync(
                connection, transaction, id, invoice, request.SupplierId, request.PurchaseDate, totalAmount);

            foreach (var item in request.Items)
            {
                var lineTotal = item.Qty * item.Price;
                await InsertPurchaseDetailAsync(connection, transaction, id, item, lineTotal);
                await ApplyStockInAsync(connection, transaction, item.ProductId, item.Qty, invoice);
            }

            await transaction.CommitAsync();

            return new PurchaseMutationResponseDto
            {
                Id = id,
                InvoiceNumber = invoice,
                TotalAmount = totalAmount
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task DeleteAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var existing = await GetPurchaseHeaderAsync(connection, transaction, id)
                ?? throw new InvalidOperationException("Purchase order tidak ditemukan.");

            var details = await GetPurchaseDetailsAsync(connection, transaction, id);
            var reference = existing.InvoiceNumber ?? $"PO-{id}";

            foreach (var item in details)
            {
                await ApplyStockOutAsync(connection, transaction, item.ProductId, item.Qty, $"DEL-{reference}");
            }

            await using (var cmd = new SqlCommand("DELETE FROM Purchases WHERE Id = @id", connection, transaction))
            {
                cmd.Parameters.AddWithValue("@id", id);
                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) throw new InvalidOperationException("Purchase order tidak ditemukan.");
            }

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private sealed record PurchaseHeaderRecord(long Id, string? InvoiceNumber);

    private sealed record PurchaseDetailRecord(int ProductId, int Qty);

    private static async Task<PurchaseHeaderRecord?> GetPurchaseHeaderAsync(
        SqlConnection connection, SqlTransaction transaction, long id)
    {
        await using var cmd = new SqlCommand(
            "SELECT Id, InvoiceNumber FROM Purchases WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return new PurchaseHeaderRecord(reader.GetInt64(0), reader.IsDBNull(1) ? null : reader.GetString(1));
    }

    private static async Task<List<PurchaseDetailRecord>> GetPurchaseDetailsAsync(
        SqlConnection connection, SqlTransaction transaction, long purchaseId)
    {
        var list = new List<PurchaseDetailRecord>();
        await using var cmd = new SqlCommand(
            "SELECT ProductId, Qty FROM PurchaseDetails WHERE PurchaseId = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", purchaseId);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new PurchaseDetailRecord(reader.GetInt32(0), reader.GetInt32(1)));
        }

        return list;
    }

    private static async Task<bool> InvoiceExistsAsync(
        SqlConnection connection, SqlTransaction transaction, string invoice, long? excludeId)
    {
        var sql = "SELECT COUNT(1) FROM Purchases WHERE InvoiceNumber = @invoice";
        if (excludeId.HasValue) sql += " AND Id <> @excludeId";

        await using var cmd = new SqlCommand(sql, connection, transaction);
        cmd.Parameters.AddWithValue("@invoice", invoice);
        if (excludeId.HasValue) cmd.Parameters.AddWithValue("@excludeId", excludeId.Value);

        return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
    }

    private static async Task<string> GenerateInvoiceNumberAsync(
        SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(@"
            SELECT COUNT(1) + 1
            FROM Purchases
            WHERE CAST(PurchaseDate AS DATE) = CAST(SYSUTCDATETIME() AS DATE)", connection, transaction);
        var seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"PO-{DateTime.UtcNow:yyyyMMdd}-{seq:D3}";
    }

    private static async Task<long> InsertPurchaseAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        string invoice,
        int? supplierId,
        DateTime purchaseDate,
        decimal totalAmount)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO Purchases (InvoiceNumber, SupplierId, PurchaseDate, TotalAmount)
            OUTPUT INSERTED.Id
            VALUES (@invoice, @supplierId, @date, @total)", connection, transaction);
        cmd.Parameters.AddWithValue("@invoice", invoice);
        cmd.Parameters.AddWithValue("@supplierId", (object?)supplierId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@date", purchaseDate);
        cmd.Parameters.AddWithValue("@total", totalAmount);
        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private static async Task UpdatePurchaseHeaderAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        long id,
        string invoice,
        int? supplierId,
        DateTime purchaseDate,
        decimal totalAmount)
    {
        await using var cmd = new SqlCommand(@"
            UPDATE Purchases
            SET InvoiceNumber = @invoice, SupplierId = @supplierId,
                PurchaseDate = @date, TotalAmount = @total
            WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@invoice", invoice);
        cmd.Parameters.AddWithValue("@supplierId", (object?)supplierId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@date", purchaseDate);
        cmd.Parameters.AddWithValue("@total", totalAmount);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertPurchaseDetailAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        long purchaseId,
        CreatePurchaseItemDto item,
        decimal lineTotal)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO PurchaseDetails (PurchaseId, ProductId, Qty, Price, Total)
            VALUES (@purchaseId, @productId, @qty, @price, @total)", connection, transaction);
        cmd.Parameters.AddWithValue("@purchaseId", purchaseId);
        cmd.Parameters.AddWithValue("@productId", item.ProductId);
        cmd.Parameters.AddWithValue("@qty", item.Qty);
        cmd.Parameters.AddWithValue("@price", item.Price);
        cmd.Parameters.AddWithValue("@total", lineTotal);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task DeletePurchaseDetailsAsync(
        SqlConnection connection, SqlTransaction transaction, long purchaseId)
    {
        await using var cmd = new SqlCommand(
            "DELETE FROM PurchaseDetails WHERE PurchaseId = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", purchaseId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task ApplyStockInAsync(
        SqlConnection connection, SqlTransaction transaction,
        int productId, int qty, string reference)
    {
        if (!await ProductExistsAsync(connection, transaction, productId))
            throw new InvalidOperationException($"Produk ID {productId} tidak ditemukan.");

        await using var updateCmd = new SqlCommand(
            "UPDATE Products SET Stock = Stock + @qty WHERE Id = @id", connection, transaction);
        updateCmd.Parameters.AddWithValue("@qty", qty);
        updateCmd.Parameters.AddWithValue("@id", productId);
        await updateCmd.ExecuteNonQueryAsync();

        await InsertStockMovementAsync(connection, transaction, productId, "IN", qty, reference);
    }

    private static async Task ApplyStockOutAsync(
        SqlConnection connection, SqlTransaction transaction,
        int productId, int qty, string reference)
    {
        var stock = await GetProductStockAsync(connection, transaction, productId);
        if (stock is null)
            throw new InvalidOperationException($"Produk ID {productId} tidak ditemukan.");
        if (stock.Value < qty)
            throw new InvalidOperationException(
                $"Stok tidak cukup untuk membatalkan pembelian. Tersedia: {stock}, dibutuhkan: {qty}.");

        await using var updateCmd = new SqlCommand(
            "UPDATE Products SET Stock = Stock - @qty WHERE Id = @id", connection, transaction);
        updateCmd.Parameters.AddWithValue("@qty", qty);
        updateCmd.Parameters.AddWithValue("@id", productId);
        await updateCmd.ExecuteNonQueryAsync();

        await InsertStockMovementAsync(connection, transaction, productId, "OUT", qty, reference);
    }

    private static async Task<bool> ProductExistsAsync(
        SqlConnection connection, SqlTransaction transaction, int productId)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Products WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", productId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
    }

    private static async Task<int?> GetProductStockAsync(
        SqlConnection connection, SqlTransaction transaction, int productId)
    {
        await using var cmd = new SqlCommand(
            "SELECT Stock FROM Products WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", productId);
        var result = await cmd.ExecuteScalarAsync();
        return result is null or DBNull ? null : Convert.ToInt32(result);
    }

    private static async Task InsertStockMovementAsync(
        SqlConnection connection, SqlTransaction transaction,
        int productId, string type, int qty, string reference)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO StockMovements (ProductId, MovementType, Qty, ReferenceNumber)
            VALUES (@productId, @type, @qty, @ref)", connection, transaction);
        cmd.Parameters.AddWithValue("@productId", productId);
        cmd.Parameters.AddWithValue("@type", type);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@ref", reference);
        await cmd.ExecuteNonQueryAsync();
    }
}
