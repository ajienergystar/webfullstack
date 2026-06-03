using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public ProductRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<ProductFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var categories = new List<ProductCategoryDto>();

        await using (var cmd = new SqlCommand(
            "SELECT Id, CategoryName FROM Categories ORDER BY CategoryName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                categories.Add(new ProductCategoryDto
                {
                    Id = reader.GetInt32(0),
                    CategoryName = reader.GetString(1)
                });
            }
        }

        var brands = new List<ProductBrandDto>();
        await using (var cmd = new SqlCommand(
            "SELECT Id, BrandName FROM Brands WHERE IsActive = 1 ORDER BY BrandName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                brands.Add(new ProductBrandDto
                {
                    Id = reader.GetInt32(0),
                    BrandName = reader.GetString(1)
                });
            }
        }

        return new ProductFormDataDto { Categories = categories, Brands = brands };
    }

    public async Task<ProductListResponseDto> GetListAsync(
        string? search, int? categoryId, bool? isActive)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(P.ProductName LIKE @search OR P.ProductCode LIKE @search OR P.Barcode LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (categoryId is > 0)
        {
            where.Add("P.CategoryId = @categoryId");
            cmd.Parameters.AddWithValue("@categoryId", categoryId.Value);
        }

        if (isActive.HasValue)
        {
            where.Add("P.IsActive = @isActive");
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);
        }

        cmd.CommandText = $@"
            SELECT P.Id, P.CategoryId, C.CategoryName, P.BrandId, B.BrandName,
                   P.ProductCode, P.ProductName, P.Barcode,
                   P.PurchasePrice, P.SellingPrice, P.Stock, P.Unit, P.IsActive, P.CreatedAt
            FROM Products P
            LEFT JOIN Categories C ON P.CategoryId = C.Id
            LEFT JOIN Brands B ON P.BrandId = B.Id
            WHERE {string.Join(" AND ", where)}
            ORDER BY P.ProductName";

        var products = new List<ProductListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                products.Add(MapListItem(reader));
            }
        }

        var activeCount = products.Count(p => p.IsActive);
        return new ProductListResponseDto
        {
            Products = products,
            TotalCount = products.Count,
            ActiveCount = activeCount
        };
    }

    public async Task<ProductListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT P.Id, P.CategoryId, C.CategoryName, P.BrandId, B.BrandName,
                   P.ProductCode, P.ProductName, P.Barcode,
                   P.PurchasePrice, P.SellingPrice, P.Stock, P.Unit, P.IsActive, P.CreatedAt
            FROM Products P
            LEFT JOIN Categories C ON P.CategoryId = C.Id
            LEFT JOIN Brands B ON P.BrandId = B.Id
            WHERE P.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapListItem(reader);
    }

    public async Task<ProductMutationResponseDto> CreateAsync(CreateProductRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            if (request.CategoryId.HasValue)
                await EnsureCategoryExistsAsync(connection, transaction, request.CategoryId.Value);
            if (request.BrandId.HasValue)
                await EnsureBrandExistsAsync(connection, transaction, request.BrandId.Value);

            var productCode = string.IsNullOrWhiteSpace(request.ProductCode)
                ? await GenerateProductCodeAsync(connection, transaction)
                : request.ProductCode.Trim();

            await EnsureUniqueCodeAsync(connection, transaction, productCode, null);
            if (!string.IsNullOrWhiteSpace(request.Barcode))
                await EnsureUniqueBarcodeAsync(connection, transaction, request.Barcode.Trim(), null);

            await using var insertCmd = new SqlCommand(@"
                INSERT INTO Products
                    (CategoryId, BrandId, ProductCode, ProductName, Barcode, PurchasePrice, SellingPrice, Stock, Unit, IsActive)
                OUTPUT INSERTED.Id
                VALUES (@categoryId, @brandId, @code, @name, @barcode, @purchase, @selling, @stock, @unit, @active)",
                connection, transaction);

            insertCmd.Parameters.AddWithValue("@categoryId",
                request.CategoryId.HasValue ? request.CategoryId.Value : DBNull.Value);
            insertCmd.Parameters.AddWithValue("@brandId",
                request.BrandId.HasValue ? request.BrandId.Value : DBNull.Value);
            insertCmd.Parameters.AddWithValue("@code", productCode);
            insertCmd.Parameters.AddWithValue("@name", request.ProductName.Trim());
            insertCmd.Parameters.AddWithValue("@barcode",
                string.IsNullOrWhiteSpace(request.Barcode) ? DBNull.Value : request.Barcode.Trim());
            insertCmd.Parameters.AddWithValue("@purchase", request.PurchasePrice);
            insertCmd.Parameters.AddWithValue("@selling", request.SellingPrice);
            insertCmd.Parameters.AddWithValue("@stock", request.Stock);
            insertCmd.Parameters.AddWithValue("@unit",
                string.IsNullOrWhiteSpace(request.Unit) ? DBNull.Value : request.Unit.Trim());
            insertCmd.Parameters.AddWithValue("@active", request.IsActive);

            var newId = Convert.ToInt32(await insertCmd.ExecuteScalarAsync());

            if (request.Stock > 0)
            {
                await InsertStockMovementAsync(
                    connection, transaction, newId, "IN", request.Stock, $"NEW-{productCode}");
            }

            await transaction.CommitAsync();
            return new ProductMutationResponseDto
            {
                Id = newId,
                ProductCode = productCode,
                ProductName = request.ProductName.Trim()
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<ProductMutationResponseDto> UpdateAsync(int id, UpdateProductRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var existing = await LoadStockAndCodeAsync(connection, transaction, id);
            if (existing is null)
                throw new InvalidOperationException("Produk tidak ditemukan.");

            if (request.CategoryId.HasValue)
                await EnsureCategoryExistsAsync(connection, transaction, request.CategoryId.Value);
            if (request.BrandId.HasValue)
                await EnsureBrandExistsAsync(connection, transaction, request.BrandId.Value);

            var productCode = string.IsNullOrWhiteSpace(request.ProductCode)
                ? existing.Value.Code
                : request.ProductCode.Trim();

            await EnsureUniqueCodeAsync(connection, transaction, productCode, id);
            if (!string.IsNullOrWhiteSpace(request.Barcode))
                await EnsureUniqueBarcodeAsync(connection, transaction, request.Barcode.Trim(), id);

            await using var updateCmd = new SqlCommand(@"
                UPDATE Products SET
                    CategoryId = @categoryId,
                    BrandId = @brandId,
                    ProductCode = @code,
                    ProductName = @name,
                    Barcode = @barcode,
                    PurchasePrice = @purchase,
                    SellingPrice = @selling,
                    Stock = @stock,
                    Unit = @unit,
                    IsActive = @active
                WHERE Id = @id", connection, transaction);

            updateCmd.Parameters.AddWithValue("@categoryId",
                request.CategoryId.HasValue ? request.CategoryId.Value : DBNull.Value);
            updateCmd.Parameters.AddWithValue("@brandId",
                request.BrandId.HasValue ? request.BrandId.Value : DBNull.Value);
            updateCmd.Parameters.AddWithValue("@code", productCode);
            updateCmd.Parameters.AddWithValue("@name", request.ProductName.Trim());
            updateCmd.Parameters.AddWithValue("@barcode",
                string.IsNullOrWhiteSpace(request.Barcode) ? DBNull.Value : request.Barcode.Trim());
            updateCmd.Parameters.AddWithValue("@purchase", request.PurchasePrice);
            updateCmd.Parameters.AddWithValue("@selling", request.SellingPrice);
            updateCmd.Parameters.AddWithValue("@stock", request.Stock);
            updateCmd.Parameters.AddWithValue("@unit",
                string.IsNullOrWhiteSpace(request.Unit) ? DBNull.Value : request.Unit.Trim());
            updateCmd.Parameters.AddWithValue("@active", request.IsActive);
            updateCmd.Parameters.AddWithValue("@id", id);
            await updateCmd.ExecuteNonQueryAsync();

            var stockDelta = request.Stock - existing.Value.Stock;
            if (stockDelta != 0)
            {
                var movementType = stockDelta > 0 ? "IN" : "OUT";
                await InsertStockMovementAsync(
                    connection, transaction, id, movementType, Math.Abs(stockDelta), $"ADJ-{productCode}");
            }

            await transaction.CommitAsync();
            return new ProductMutationResponseDto
            {
                Id = id,
                ProductCode = productCode,
                ProductName = request.ProductName.Trim()
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static ProductListItemDto MapListItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        CategoryId = reader.IsDBNull(1) ? null : reader.GetInt32(1),
        CategoryName = reader.IsDBNull(2) ? null : reader.GetString(2),
        BrandId = reader.IsDBNull(3) ? null : reader.GetInt32(3),
        BrandName = reader.IsDBNull(4) ? null : reader.GetString(4),
        ProductCode = reader.IsDBNull(5) ? "" : reader.GetString(5),
        ProductName = reader.GetString(6),
        Barcode = reader.IsDBNull(7) ? null : reader.GetString(7),
        PurchasePrice = reader.GetDecimal(8),
        SellingPrice = reader.GetDecimal(9),
        Stock = reader.GetInt32(10),
        Unit = reader.IsDBNull(11) ? null : reader.GetString(11),
        IsActive = reader.GetBoolean(12),
        CreatedAt = reader.GetDateTime(13)
    };

    private static async Task EnsureCategoryExistsAsync(
        SqlConnection connection, SqlTransaction transaction, int categoryId)
    {
        await using var cmd = new SqlCommand(
            "SELECT 1 FROM Categories WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", categoryId);
        var exists = await cmd.ExecuteScalarAsync();
        if (exists is null)
            throw new InvalidOperationException("Kategori tidak ditemukan.");
    }

    private static async Task EnsureBrandExistsAsync(
        SqlConnection connection, SqlTransaction transaction, int brandId)
    {
        await using var cmd = new SqlCommand(
            "SELECT 1 FROM Brands WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", brandId);
        var exists = await cmd.ExecuteScalarAsync();
        if (exists is null)
            throw new InvalidOperationException("Brand tidak ditemukan.");
    }

    private static async Task EnsureUniqueCodeAsync(
        SqlConnection connection, SqlTransaction transaction, string code, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Products WHERE ProductCode = @code AND (@exclude IS NULL OR Id <> @exclude)",
            connection, transaction);
        cmd.Parameters.AddWithValue("@code", code);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Kode produk '{code}' sudah digunakan.");
    }

    private static async Task EnsureUniqueBarcodeAsync(
        SqlConnection connection, SqlTransaction transaction, string barcode, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Products WHERE Barcode = @barcode AND (@exclude IS NULL OR Id <> @exclude)",
            connection, transaction);
        cmd.Parameters.AddWithValue("@barcode", barcode);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Barcode '{barcode}' sudah digunakan.");
    }

    private static async Task<string> GenerateProductCodeAsync(
        SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) + 1 FROM Products", connection, transaction);
        var seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"PRD-{DateTime.UtcNow:yyyyMMdd}-{seq:D4}";
    }

    private static async Task<(int Stock, string Code)?> LoadStockAndCodeAsync(
        SqlConnection connection, SqlTransaction transaction, int id)
    {
        await using var cmd = new SqlCommand(
            "SELECT Stock, ProductCode FROM Products WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@id", id);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return (reader.GetInt32(0), reader.IsDBNull(1) ? "" : reader.GetString(1));
    }

    private static async Task InsertStockMovementAsync(
        SqlConnection connection, SqlTransaction transaction,
        int productId, string movementType, int qty, string referenceNumber)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO StockMovements (ProductId, MovementType, Qty, ReferenceNumber)
            VALUES (@productId, @type, @qty, @ref)", connection, transaction);

        cmd.Parameters.AddWithValue("@productId", productId);
        cmd.Parameters.AddWithValue("@type", movementType);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@ref", referenceNumber);
        await cmd.ExecuteNonQueryAsync();
    }
}
