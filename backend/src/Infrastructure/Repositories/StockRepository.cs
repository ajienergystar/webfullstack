using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class StockRepository : IStockRepository
{
    private const int LowStockThreshold = 5;

    private readonly IPosSqlConnectionFactory _connectionFactory;

    public StockRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<StockOverviewResponseDto> GetOverviewAsync(string? search, bool lowStockOnly)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(P.ProductName LIKE @search OR P.ProductCode LIKE @search OR P.Barcode LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (lowStockOnly)
            where.Add($"P.Stock <= {LowStockThreshold}");

        cmd.CommandText = $@"
            SELECT P.Id, P.ProductCode, P.ProductName, C.CategoryName, P.Unit, P.Stock, P.IsActive
            FROM Products P
            LEFT JOIN Categories C ON P.CategoryId = C.Id
            WHERE {string.Join(" AND ", where)}
            ORDER BY P.Stock ASC, P.ProductName";

        var products = new List<StockProductItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                products.Add(new StockProductItemDto
                {
                    Id = reader.GetInt32(0),
                    ProductCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    ProductName = reader.GetString(2),
                    CategoryName = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Unit = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Stock = reader.GetInt32(5),
                    IsActive = reader.GetBoolean(6)
                });
            }
        }

        return new StockOverviewResponseDto
        {
            Products = products,
            TotalProducts = products.Count,
            LowStockCount = products.Count(p => p.Stock <= LowStockThreshold),
            TotalStockUnits = products.Sum(p => p.Stock)
        };
    }

    public async Task<StockMovementListResponseDto> GetMovementsAsync(
        string? search, string? movementType, int? productId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(P.ProductName LIKE @search OR P.ProductCode LIKE @search OR M.ReferenceNumber LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (!string.IsNullOrWhiteSpace(movementType))
        {
            where.Add("M.MovementType = @type");
            cmd.Parameters.AddWithValue("@type", movementType.Trim().ToUpperInvariant());
        }

        if (productId is > 0)
        {
            where.Add("M.ProductId = @productId");
            cmd.Parameters.AddWithValue("@productId", productId.Value);
        }

        cmd.CommandText = $@"
            SELECT TOP 200 M.Id, M.ProductId, P.ProductCode, P.ProductName,
                   M.MovementType, M.Qty, M.ReferenceNumber, M.CreatedAt
            FROM StockMovements M
            INNER JOIN Products P ON M.ProductId = P.Id
            WHERE {string.Join(" AND ", where)}
            ORDER BY M.CreatedAt DESC, M.Id DESC";

        var movements = new List<StockMovementItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                movements.Add(new StockMovementItemDto
                {
                    Id = reader.GetInt64(0),
                    ProductId = reader.GetInt32(1),
                    ProductCode = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ProductName = reader.GetString(3),
                    MovementType = reader.GetString(4),
                    Qty = reader.GetInt32(5),
                    ReferenceNumber = reader.IsDBNull(6) ? null : reader.GetString(6),
                    CreatedAt = reader.GetDateTime(7)
                });
            }
        }

        return new StockMovementListResponseDto
        {
            Movements = movements,
            TotalCount = movements.Count
        };
    }

    public async Task<StockFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var products = new List<StockProductOptionDto>();

        await using var cmd = new SqlCommand(@"
            SELECT Id, ProductCode, ProductName, Stock, Unit
            FROM Products
            WHERE IsActive = 1
            ORDER BY ProductName", connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            products.Add(new StockProductOptionDto
            {
                Id = reader.GetInt32(0),
                ProductCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                ProductName = reader.GetString(2),
                Stock = reader.GetInt32(3),
                Unit = reader.IsDBNull(4) ? null : reader.GetString(4)
            });
        }

        return new StockFormDataDto { Products = products };
    }

    public async Task<StockAdjustmentResponseDto> AdjustStockAsync(CreateStockAdjustmentRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var currentStock = await GetProductStockAsync(connection, transaction, request.ProductId);
            if (currentStock is null)
                throw new InvalidOperationException("Produk tidak ditemukan.");

            var (productName, stock) = currentStock.Value;
            var type = request.MovementType.ToUpperInvariant();
            var qty = request.Qty;

            if (type == "OUT" && stock < qty)
                throw new InvalidOperationException(
                    $"Stok tidak cukup. Tersedia: {stock}, diminta: {qty}.");

            var reference = string.IsNullOrWhiteSpace(request.ReferenceNumber)
                ? await GenerateReferenceAsync(connection, transaction)
                : request.ReferenceNumber.Trim();

            var delta = type == "IN" ? qty : -qty;
            await UpdateStockAsync(connection, transaction, request.ProductId, delta);
            var movementId = await InsertMovementAsync(
                connection, transaction, request.ProductId, type, qty, reference);

            await transaction.CommitAsync();

            return new StockAdjustmentResponseDto
            {
                MovementId = movementId,
                ReferenceNumber = reference,
                ProductId = request.ProductId,
                ProductName = productName,
                MovementType = type,
                Qty = qty,
                NewStock = stock + delta
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
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

    private static async Task UpdateStockAsync(
        SqlConnection connection, SqlTransaction transaction, int productId, int delta)
    {
        await using var cmd = new SqlCommand(
            "UPDATE Products SET Stock = Stock + @delta WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@delta", delta);
        cmd.Parameters.AddWithValue("@id", productId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<long> InsertMovementAsync(
        SqlConnection connection, SqlTransaction transaction,
        int productId, string type, int qty, string reference)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO StockMovements (ProductId, MovementType, Qty, ReferenceNumber)
            OUTPUT INSERTED.Id
            VALUES (@productId, @type, @qty, @ref)", connection, transaction);
        cmd.Parameters.AddWithValue("@productId", productId);
        cmd.Parameters.AddWithValue("@type", type);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@ref", reference);
        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private static async Task<string> GenerateReferenceAsync(
        SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) + 1 FROM StockMovements", connection, transaction);
        var seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"STK-{DateTime.UtcNow:yyyyMMdd}-{seq:D4}";
    }
}
