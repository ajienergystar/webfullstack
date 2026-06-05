using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class StockTransferRepository : IStockTransferRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public StockTransferRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<StockTransferFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var outlets = new List<StockTransferOutletOptionDto>();
        await using (var cmd = new SqlCommand(
            "SELECT Id, OutletName FROM Outlets ORDER BY OutletName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                outlets.Add(new StockTransferOutletOptionDto
                {
                    Id = reader.GetInt32(0),
                    OutletName = reader.IsDBNull(1) ? "" : reader.GetString(1)
                });
            }
        }

        var products = new List<StockTransferProductOptionDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT P.Id, P.ProductCode, P.ProductName, P.Barcode, C.CategoryName, P.Stock, P.Unit
            FROM Products P
            LEFT JOIN Categories C ON P.CategoryId = C.Id
            WHERE P.IsActive = 1
            ORDER BY P.ProductName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                products.Add(new StockTransferProductOptionDto
                {
                    Id = reader.GetInt32(0),
                    ProductCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    ProductName = reader.GetString(2),
                    Barcode = reader.IsDBNull(3) ? null : reader.GetString(3),
                    CategoryName = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Stock = reader.GetInt32(5),
                    Unit = reader.IsDBNull(6) ? null : reader.GetString(6)
                });
            }
        }

        return new StockTransferFormDataDto { Outlets = outlets, Products = products };
    }

    public async Task<StockTransferListResponseDto> GetListAsync(
        string? search, DateTime? dateFrom, DateTime? dateTo, int? fromOutletId, int? toOutletId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add(@"(T.ReferenceNumber LIKE @search OR FO.OutletName LIKE @search
                OR TOO.OutletName LIKE @search OR T.Notes LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (dateFrom.HasValue)
        {
            where.Add("T.TransferDate >= @dateFrom");
            cmd.Parameters.AddWithValue("@dateFrom", dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            where.Add("T.TransferDate < @dateTo");
            cmd.Parameters.AddWithValue("@dateTo", dateTo.Value);
        }

        if (fromOutletId is > 0)
        {
            where.Add("T.FromOutletId = @fromOutletId");
            cmd.Parameters.AddWithValue("@fromOutletId", fromOutletId.Value);
        }

        if (toOutletId is > 0)
        {
            where.Add("T.ToOutletId = @toOutletId");
            cmd.Parameters.AddWithValue("@toOutletId", toOutletId.Value);
        }

        cmd.CommandText = $@"
            SELECT T.Id, T.ReferenceNumber, T.FromOutletId, FO.OutletName,
                   T.ToOutletId, TOO.OutletName, T.TransferDate, T.Status,
                   (SELECT COUNT(1) FROM StockTransferDetails D WHERE D.TransferId = T.Id) AS LineCount,
                   (SELECT ISNULL(SUM(D.Qty), 0) FROM StockTransferDetails D WHERE D.TransferId = T.Id) AS TotalQty
            FROM StockTransfers T
            INNER JOIN Outlets FO ON T.FromOutletId = FO.Id
            INNER JOIN Outlets TOO ON T.ToOutletId = TOO.Id
            WHERE {string.Join(" AND ", where)}
            ORDER BY T.TransferDate DESC, T.Id DESC";

        var transfers = new List<StockTransferListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                transfers.Add(new StockTransferListItemDto
                {
                    Id = reader.GetInt64(0),
                    ReferenceNumber = reader.GetString(1),
                    FromOutletId = reader.GetInt32(2),
                    FromOutletName = reader.IsDBNull(3) ? "" : reader.GetString(3),
                    ToOutletId = reader.GetInt32(4),
                    ToOutletName = reader.IsDBNull(5) ? "" : reader.GetString(5),
                    TransferDate = reader.GetDateTime(6),
                    Status = reader.GetString(7),
                    LineCount = reader.GetInt32(8),
                    TotalQty = reader.GetInt32(9)
                });
            }
        }

        return new StockTransferListResponseDto
        {
            Transfers = transfers,
            TotalCount = transfers.Count,
            TotalQty = transfers.Sum(t => t.TotalQty)
        };
    }

    public async Task<StockTransferDetailResponseDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        StockTransferDetailResponseDto? header = null;
        await using (var cmd = new SqlCommand(@"
            SELECT T.Id, T.ReferenceNumber, T.FromOutletId, FO.OutletName,
                   T.ToOutletId, TOO.OutletName, T.TransferDate, T.Notes, T.Status
            FROM StockTransfers T
            INNER JOIN Outlets FO ON T.FromOutletId = FO.Id
            INNER JOIN Outlets TOO ON T.ToOutletId = TOO.Id
            WHERE T.Id = @id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            header = new StockTransferDetailResponseDto
            {
                Id = reader.GetInt64(0),
                ReferenceNumber = reader.GetString(1),
                FromOutletId = reader.GetInt32(2),
                FromOutletName = reader.IsDBNull(3) ? "" : reader.GetString(3),
                ToOutletId = reader.GetInt32(4),
                ToOutletName = reader.IsDBNull(5) ? "" : reader.GetString(5),
                TransferDate = reader.GetDateTime(6),
                Notes = reader.IsDBNull(7) ? null : reader.GetString(7),
                Status = reader.GetString(8)
            };
        }

        var details = new List<StockTransferDetailLineDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT D.Id, D.ProductId, P.ProductCode, P.ProductName, P.Unit, D.Qty
            FROM StockTransferDetails D
            INNER JOIN Products P ON D.ProductId = P.Id
            WHERE D.TransferId = @id
            ORDER BY D.Id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                details.Add(new StockTransferDetailLineDto
                {
                    Id = reader.GetInt64(0),
                    ProductId = reader.GetInt32(1),
                    ProductCode = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ProductName = reader.GetString(3),
                    Unit = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Qty = reader.GetInt32(5)
                });
            }
        }

        header!.Details = details;
        return header;
    }

    public async Task<StockTransferMutationResponseDto> CreateAsync(CreateStockTransferRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            await ValidateItemsAsync(connection, transaction, request.Items);

            var reference = string.IsNullOrWhiteSpace(request.ReferenceNumber)
                ? await GenerateReferenceAsync(connection, transaction)
                : request.ReferenceNumber.Trim();

            if (await ReferenceExistsAsync(connection, transaction, reference, null))
                throw new InvalidOperationException($"Nomor referensi '{reference}' sudah dipakai.");

            var transferId = await InsertTransferAsync(connection, transaction, request, reference);
            var totalQty = 0;

            foreach (var item in request.Items)
            {
                await InsertDetailAsync(connection, transaction, transferId, item.ProductId, item.Qty);
                await InsertMovementAsync(connection, transaction, item.ProductId, item.Qty, reference);
                totalQty += item.Qty;
            }

            await transaction.CommitAsync();

            return new StockTransferMutationResponseDto
            {
                Id = transferId,
                ReferenceNumber = reference,
                TotalQty = totalQty
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<StockTransferMutationResponseDto> UpdateAsync(
        long id, UpdateStockTransferRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var existing = await GetTransferHeaderAsync(connection, transaction, id)
                ?? throw new InvalidOperationException("Transfer stok tidak ditemukan.");

            await ValidateItemsAsync(connection, transaction, request.Items);

            var reference = string.IsNullOrWhiteSpace(request.ReferenceNumber)
                ? existing.ReferenceNumber
                : request.ReferenceNumber.Trim();

            if (await ReferenceExistsAsync(connection, transaction, reference, id))
                throw new InvalidOperationException($"Nomor referensi '{reference}' sudah dipakai.");

            await DeleteDetailsAsync(connection, transaction, id);
            await UpdateTransferHeaderAsync(connection, transaction, id, request, reference);

            var totalQty = 0;
            foreach (var item in request.Items)
            {
                await InsertDetailAsync(connection, transaction, id, item.ProductId, item.Qty);
                await InsertMovementAsync(
                    connection, transaction, item.ProductId, item.Qty, $"REV-{reference}");
                totalQty += item.Qty;
            }

            await transaction.CommitAsync();

            return new StockTransferMutationResponseDto
            {
                Id = id,
                ReferenceNumber = reference,
                TotalQty = totalQty
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
            var existing = await GetTransferHeaderAsync(connection, transaction, id)
                ?? throw new InvalidOperationException("Transfer stok tidak ditemukan.");

            var details = await GetDetailQtyAsync(connection, transaction, id);
            foreach (var (productId, qty) in details)
            {
                await InsertMovementAsync(
                    connection, transaction, productId, qty, $"DEL-{existing.ReferenceNumber}");
            }

            await using (var cmd = new SqlCommand(
                "DELETE FROM StockTransfers WHERE Id = @id", connection, transaction))
            {
                cmd.Parameters.AddWithValue("@id", id);
                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) throw new InvalidOperationException("Transfer stok tidak ditemukan.");
            }

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> OutletExistsAsync(int outletId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Outlets WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", outletId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
    }

    private static async Task ValidateItemsAsync(
        SqlConnection connection, SqlTransaction transaction,
        List<CreateStockTransferItemDto> items)
    {
        if (items.Count == 0)
            throw new InvalidOperationException("Minimal satu produk wajib ditambahkan.");

        var seen = new HashSet<int>();
        foreach (var item in items)
        {
            if (item.Qty <= 0)
                throw new InvalidOperationException("Qty setiap produk harus lebih dari 0.");

            if (!seen.Add(item.ProductId))
                throw new InvalidOperationException("Produk duplikat dalam daftar transfer.");

            var productStock = await GetProductStockAsync(connection, transaction, item.ProductId);
            if (productStock is null)
                throw new InvalidOperationException($"Produk ID {item.ProductId} tidak ditemukan.");

            if (productStock.Value.Stock < item.Qty)
                throw new InvalidOperationException(
                    $"Stok tidak cukup untuk {productStock.Value.Name}. Tersedia: {productStock.Value.Stock}, diminta: {item.Qty}.");
        }
    }

    private static async Task<(string Name, int Stock)?> GetProductStockAsync(
        SqlConnection connection, SqlTransaction transaction, int productId)
    {
        await using var cmd = new SqlCommand(
            "SELECT ProductName, Stock FROM Products WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", productId);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return (reader.GetString(0), reader.GetInt32(1));
    }

    private static async Task<long> InsertTransferAsync(
        SqlConnection connection, SqlTransaction transaction,
        CreateStockTransferRequestDto request, string reference)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO StockTransfers
                (ReferenceNumber, FromOutletId, ToOutletId, TransferDate, Notes, Status)
            OUTPUT INSERTED.Id
            VALUES (@ref, @fromId, @toId, @date, @notes, 'Completed')",
            connection, transaction);
        cmd.Parameters.AddWithValue("@ref", reference);
        cmd.Parameters.AddWithValue("@fromId", request.FromOutletId);
        cmd.Parameters.AddWithValue("@toId", request.ToOutletId);
        cmd.Parameters.AddWithValue("@date", request.TransferDate);
        cmd.Parameters.AddWithValue("@notes", (object?)request.Notes?.Trim() ?? DBNull.Value);
        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private static async Task UpdateTransferHeaderAsync(
        SqlConnection connection, SqlTransaction transaction,
        long id, UpdateStockTransferRequestDto request, string reference)
    {
        await using var cmd = new SqlCommand(@"
            UPDATE StockTransfers
            SET ReferenceNumber = @ref, FromOutletId = @fromId, ToOutletId = @toId,
                TransferDate = @date, Notes = @notes
            WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@ref", reference);
        cmd.Parameters.AddWithValue("@fromId", request.FromOutletId);
        cmd.Parameters.AddWithValue("@toId", request.ToOutletId);
        cmd.Parameters.AddWithValue("@date", request.TransferDate);
        cmd.Parameters.AddWithValue("@notes", (object?)request.Notes?.Trim() ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertDetailAsync(
        SqlConnection connection, SqlTransaction transaction,
        long transferId, int productId, int qty)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO StockTransferDetails (TransferId, ProductId, Qty)
            VALUES (@transferId, @productId, @qty)", connection, transaction);
        cmd.Parameters.AddWithValue("@transferId", transferId);
        cmd.Parameters.AddWithValue("@productId", productId);
        cmd.Parameters.AddWithValue("@qty", qty);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertMovementAsync(
        SqlConnection connection, SqlTransaction transaction,
        int productId, int qty, string reference)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO StockMovements (ProductId, MovementType, Qty, ReferenceNumber)
            VALUES (@productId, 'TRANSFER', @qty, @ref)", connection, transaction);
        cmd.Parameters.AddWithValue("@productId", productId);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@ref", reference);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<string> GenerateReferenceAsync(
        SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) + 1 FROM StockTransfers", connection, transaction);
        var seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"TRF-{DateTime.UtcNow:yyyyMMdd}-{seq:D4}";
    }

    private static async Task<bool> ReferenceExistsAsync(
        SqlConnection connection, SqlTransaction transaction, string reference, long? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT COUNT(1) FROM StockTransfers
            WHERE ReferenceNumber = @ref AND (@exclude IS NULL OR Id <> @exclude)",
            connection, transaction);
        cmd.Parameters.AddWithValue("@ref", reference);
        cmd.Parameters.AddWithValue("@exclude", (object?)excludeId ?? DBNull.Value);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
    }

    private sealed record TransferHeaderRecord(long Id, string ReferenceNumber);

    private static async Task<TransferHeaderRecord?> GetTransferHeaderAsync(
        SqlConnection connection, SqlTransaction transaction, long id)
    {
        await using var cmd = new SqlCommand(
            "SELECT Id, ReferenceNumber FROM StockTransfers WHERE Id = @id",
            connection, transaction);
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return new TransferHeaderRecord(reader.GetInt64(0), reader.GetString(1));
    }

    private static async Task DeleteDetailsAsync(
        SqlConnection connection, SqlTransaction transaction, long transferId)
    {
        await using var cmd = new SqlCommand(
            "DELETE FROM StockTransferDetails WHERE TransferId = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", transferId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<List<(int ProductId, int Qty)>> GetDetailQtyAsync(
        SqlConnection connection, SqlTransaction transaction, long transferId)
    {
        var list = new List<(int, int)>();
        await using var cmd = new SqlCommand(
            "SELECT ProductId, Qty FROM StockTransferDetails WHERE TransferId = @id",
            connection, transaction);
        cmd.Parameters.AddWithValue("@id", transferId);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            list.Add((reader.GetInt32(0), reader.GetInt32(1)));
        return list;
    }
}
