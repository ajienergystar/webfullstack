using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class ProductBundleRepository : IProductBundleRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public ProductBundleRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<ProductBundleFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var products = new List<ProductBundleProductOptionDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT P.Id, P.ProductCode, P.ProductName, C.CategoryName, P.SellingPrice, P.Unit
            FROM Products P
            LEFT JOIN Categories C ON P.CategoryId = C.Id
            WHERE P.IsActive = 1
            ORDER BY P.ProductName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                products.Add(new ProductBundleProductOptionDto
                {
                    Id = reader.GetInt32(0),
                    ProductCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    ProductName = reader.GetString(2),
                    CategoryName = reader.IsDBNull(3) ? null : reader.GetString(3),
                    SellingPrice = reader.GetDecimal(4),
                    Unit = reader.IsDBNull(5) ? null : reader.GetString(5)
                });
            }
        }

        var outlets = new List<ProductBundleOutletOptionDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT Id, OutletName FROM Outlets ORDER BY OutletName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                outlets.Add(new ProductBundleOutletOptionDto
                {
                    Id = reader.GetInt32(0),
                    OutletName = reader.IsDBNull(1) ? "" : reader.GetString(1)
                });
            }
        }

        return new ProductBundleFormDataDto { Products = products, Outlets = outlets };
    }

    public async Task<ProductBundleListResponseDto> GetListAsync(string? search, bool? isActive)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var bundles = new List<ProductBundleListItemDto>();

        var sql = @"
            SELECT B.Id, B.BundleCode, B.BundleName, B.Description, B.BundlePrice,
                   B.StartDate, B.EndDate, B.OutletId, O.OutletName, B.IsActive,
                   (SELECT COUNT(*) FROM ProductBundleItems I WHERE I.ProductBundleId = B.Id) AS ItemCount,
                   B.CreatedAt,
                   ISNULL((
                       SELECT SUM(P.SellingPrice * I.Qty)
                       FROM ProductBundleItems I
                       INNER JOIN Products P ON I.ProductId = P.Id
                       WHERE I.ProductBundleId = B.Id
                   ), 0) AS NormalPrice
            FROM ProductBundles B
            LEFT JOIN Outlets O ON B.OutletId = O.Id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(search))
            sql += " AND (B.BundleCode LIKE @search OR B.BundleName LIKE @search OR B.Description LIKE @search)";
        if (isActive.HasValue)
            sql += " AND B.IsActive = @isActive";

        sql += " ORDER BY B.StartDate DESC, B.BundleName ASC";

        await using var cmd = new SqlCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        if (isActive.HasValue)
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            bundles.Add(MapListItem(reader));
        }

        return new ProductBundleListResponseDto
        {
            TotalCount = bundles.Count,
            ActiveCount = bundles.Count(b => b.IsActive),
            Bundles = bundles
        };
    }

    public async Task<ProductBundleDetailDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        ProductBundleDetailDto? detail = null;
        await using (var cmd = new SqlCommand(@"
            SELECT B.Id, B.BundleCode, B.BundleName, B.Description, B.BundlePrice,
                   B.StartDate, B.EndDate, B.OutletId, O.OutletName, B.IsActive,
                   (SELECT COUNT(*) FROM ProductBundleItems I WHERE I.ProductBundleId = B.Id) AS ItemCount,
                   B.CreatedAt,
                   ISNULL((
                       SELECT SUM(P.SellingPrice * I.Qty)
                       FROM ProductBundleItems I
                       INNER JOIN Products P ON I.ProductId = P.Id
                       WHERE I.ProductBundleId = B.Id
                   ), 0) AS NormalPrice
            FROM ProductBundles B
            LEFT JOIN Outlets O ON B.OutletId = O.Id
            WHERE B.Id = @id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;
            detail = MapDetail(reader);
        }

        detail.Items = await LoadItemsAsync(connection, id);
        return detail;
    }

    public async Task<int> CreateAsync(CreateProductBundleRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            int id;
            await using (var cmd = new SqlCommand(@"
                INSERT INTO ProductBundles
                    (BundleCode, BundleName, Description, BundlePrice, StartDate, EndDate, OutletId, IsActive)
                OUTPUT INSERTED.Id
                VALUES (@code, @name, @desc, @price, @startDate, @endDate, @outletId, @active)", connection, transaction))
            {
                AddHeaderParams(cmd, request);
                var result = await cmd.ExecuteScalarAsync();
                id = Convert.ToInt32(result);
            }

            await SaveItemsAsync(connection, transaction, id, request.Items);
            await transaction.CommitAsync();
            return id;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task UpdateAsync(int id, UpdateProductBundleRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            await using (var cmd = new SqlCommand(@"
                UPDATE ProductBundles
                SET BundleCode = @code, BundleName = @name, Description = @desc,
                    BundlePrice = @price, StartDate = @startDate, EndDate = @endDate,
                    OutletId = @outletId, IsActive = @active
                WHERE Id = @id", connection, transaction))
            {
                cmd.Parameters.AddWithValue("@id", id);
                AddHeaderParams(cmd, request);
                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) throw new InvalidOperationException("Data bundling tidak ditemukan.");
            }

            await using (var deleteCmd = new SqlCommand(
                "DELETE FROM ProductBundleItems WHERE ProductBundleId = @id", connection, transaction))
            {
                deleteCmd.Parameters.AddWithValue("@id", id);
                await deleteCmd.ExecuteNonQueryAsync();
            }

            await SaveItemsAsync(connection, transaction, id, request.Items);
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand("DELETE FROM ProductBundles WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) throw new InvalidOperationException("Data bundling tidak ditemukan.");
    }

    private static async Task<List<ProductBundleItemDto>> LoadItemsAsync(
        SqlConnection connection, int bundleId)
    {
        var items = new List<ProductBundleItemDto>();
        await using var cmd = new SqlCommand(@"
            SELECT P.Id, P.ProductCode, P.ProductName, P.Unit, P.SellingPrice, I.Qty
            FROM ProductBundleItems I
            INNER JOIN Products P ON I.ProductId = P.Id
            WHERE I.ProductBundleId = @id
            ORDER BY P.ProductName", connection);
        cmd.Parameters.AddWithValue("@id", bundleId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var sellingPrice = reader.GetDecimal(4);
            var qty = reader.GetInt32(5);
            items.Add(new ProductBundleItemDto
            {
                ProductId = reader.GetInt32(0),
                ProductCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                ProductName = reader.GetString(2),
                Unit = reader.IsDBNull(3) ? null : reader.GetString(3),
                SellingPrice = sellingPrice,
                Qty = qty,
                LineTotal = sellingPrice * qty
            });
        }

        return items;
    }

    private static async Task SaveItemsAsync(
        SqlConnection connection, SqlTransaction transaction, int bundleId,
        List<ProductBundleItemRequestDto> items)
    {
        foreach (var item in items.GroupBy(i => i.ProductId).Select(g => g.Last()))
        {
            await using var cmd = new SqlCommand(@"
                INSERT INTO ProductBundleItems (ProductBundleId, ProductId, Qty)
                VALUES (@bundleId, @productId, @qty)", connection, transaction);
            cmd.Parameters.AddWithValue("@bundleId", bundleId);
            cmd.Parameters.AddWithValue("@productId", item.ProductId);
            cmd.Parameters.AddWithValue("@qty", item.Qty);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    private static void AddHeaderParams(SqlCommand cmd, CreateProductBundleRequestDto request)
    {
        cmd.Parameters.AddWithValue("@code", request.BundleCode.Trim().ToUpperInvariant());
        cmd.Parameters.AddWithValue("@name", request.BundleName.Trim());
        cmd.Parameters.AddWithValue("@desc", (object?)request.Description?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@price", request.BundlePrice);
        cmd.Parameters.AddWithValue("@startDate", request.StartDate);
        cmd.Parameters.AddWithValue("@endDate", (object?)request.EndDate ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@outletId", (object?)request.OutletId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@active", request.IsActive);
    }

    private static ProductBundleListItemDto MapListItem(SqlDataReader reader)
    {
        var bundlePrice = reader.GetDecimal(4);
        var normalPrice = reader.GetDecimal(12);
        return new ProductBundleListItemDto
        {
            Id = reader.GetInt32(0),
            BundleCode = reader.GetString(1),
            BundleName = reader.GetString(2),
            Description = reader.IsDBNull(3) ? null : reader.GetString(3),
            BundlePrice = bundlePrice,
            StartDate = reader.GetDateTime(5),
            EndDate = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
            OutletId = reader.IsDBNull(7) ? null : reader.GetInt32(7),
            OutletName = reader.IsDBNull(8) ? null : reader.GetString(8),
            IsActive = reader.GetBoolean(9),
            ItemCount = reader.GetInt32(10),
            CreatedAt = reader.GetDateTime(11),
            NormalPrice = normalPrice,
            Savings = Math.Max(0, normalPrice - bundlePrice)
        };
    }

    private static ProductBundleDetailDto MapDetail(SqlDataReader reader)
    {
        var item = MapListItem(reader);
        return new ProductBundleDetailDto
        {
            Id = item.Id,
            BundleCode = item.BundleCode,
            BundleName = item.BundleName,
            Description = item.Description,
            BundlePrice = item.BundlePrice,
            NormalPrice = item.NormalPrice,
            Savings = item.Savings,
            StartDate = item.StartDate,
            EndDate = item.EndDate,
            OutletId = item.OutletId,
            OutletName = item.OutletName,
            IsActive = item.IsActive,
            ItemCount = item.ItemCount,
            CreatedAt = item.CreatedAt
        };
    }
}
