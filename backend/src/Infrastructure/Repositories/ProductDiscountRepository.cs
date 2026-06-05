using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class ProductDiscountRepository : IProductDiscountRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public ProductDiscountRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<ProductDiscountFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var products = new List<ProductDiscountProductOptionDto>();
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
                products.Add(new ProductDiscountProductOptionDto
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

        var outlets = new List<ProductDiscountOutletOptionDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT Id, OutletName FROM Outlets ORDER BY OutletName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                outlets.Add(new ProductDiscountOutletOptionDto
                {
                    Id = reader.GetInt32(0),
                    OutletName = reader.IsDBNull(1) ? "" : reader.GetString(1)
                });
            }
        }

        return new ProductDiscountFormDataDto { Products = products, Outlets = outlets };
    }

    public async Task<ProductDiscountListResponseDto> GetListAsync(
        string? search, string? discountType, bool? isActive)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var discounts = new List<ProductDiscountListItemDto>();

        var sql = @"
            SELECT D.Id, D.DiscountName, D.DiscountType, D.DiscountValue, D.MinPurchaseAmount,
                   D.StartDate, D.EndDate, D.OutletId, O.OutletName, D.IsActive, D.Description,
                   (SELECT COUNT(*) FROM ProductDiscountItems I WHERE I.ProductDiscountId = D.Id) AS ProductCount,
                   D.CreatedAt
            FROM ProductDiscounts D
            LEFT JOIN Outlets O ON D.OutletId = O.Id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(search))
            sql += " AND (D.DiscountName LIKE @search OR D.Description LIKE @search)";
        if (!string.IsNullOrWhiteSpace(discountType))
            sql += " AND D.DiscountType = @discountType";
        if (isActive.HasValue)
            sql += " AND D.IsActive = @isActive";

        sql += " ORDER BY D.StartDate DESC, D.DiscountName ASC";

        await using var cmd = new SqlCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        if (!string.IsNullOrWhiteSpace(discountType))
            cmd.Parameters.AddWithValue("@discountType", discountType.Trim());
        if (isActive.HasValue)
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            discounts.Add(MapListItem(reader));
        }

        return new ProductDiscountListResponseDto
        {
            TotalCount = discounts.Count,
            ActiveCount = discounts.Count(d => d.IsActive),
            Discounts = discounts
        };
    }

    public async Task<ProductDiscountDetailDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        ProductDiscountDetailDto? detail = null;
        await using (var cmd = new SqlCommand(@"
            SELECT D.Id, D.DiscountName, D.DiscountType, D.DiscountValue, D.MinPurchaseAmount,
                   D.StartDate, D.EndDate, D.OutletId, O.OutletName, D.IsActive, D.Description,
                   (SELECT COUNT(*) FROM ProductDiscountItems I WHERE I.ProductDiscountId = D.Id) AS ProductCount,
                   D.CreatedAt
            FROM ProductDiscounts D
            LEFT JOIN Outlets O ON D.OutletId = O.Id
            WHERE D.Id = @id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;
            detail = MapDetail(reader);
        }

        detail.Products = await LoadProductsAsync(connection, id);
        return detail;
    }

    public async Task<int> CreateAsync(CreateProductDiscountRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            int id;
            await using (var cmd = new SqlCommand(@"
                INSERT INTO ProductDiscounts
                    (DiscountName, DiscountType, DiscountValue, MinPurchaseAmount, StartDate, EndDate, OutletId, IsActive, Description)
                OUTPUT INSERTED.Id
                VALUES (@name, @type, @value, @minPurchase, @startDate, @endDate, @outletId, @active, @desc)", connection, transaction))
            {
                AddHeaderParams(cmd, request);
                var result = await cmd.ExecuteScalarAsync();
                id = Convert.ToInt32(result);
            }

            await SaveProductsAsync(connection, transaction, id, request.ProductIds);
            await transaction.CommitAsync();
            return id;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task UpdateAsync(int id, UpdateProductDiscountRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            await using (var cmd = new SqlCommand(@"
                UPDATE ProductDiscounts
                SET DiscountName = @name, DiscountType = @type, DiscountValue = @value,
                    MinPurchaseAmount = @minPurchase, StartDate = @startDate, EndDate = @endDate,
                    OutletId = @outletId, IsActive = @active, Description = @desc
                WHERE Id = @id", connection, transaction))
            {
                cmd.Parameters.AddWithValue("@id", id);
                AddHeaderParams(cmd, request);
                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) throw new InvalidOperationException("Data diskon produk tidak ditemukan.");
            }

            await using (var deleteCmd = new SqlCommand(
                "DELETE FROM ProductDiscountItems WHERE ProductDiscountId = @id", connection, transaction))
            {
                deleteCmd.Parameters.AddWithValue("@id", id);
                await deleteCmd.ExecuteNonQueryAsync();
            }

            await SaveProductsAsync(connection, transaction, id, request.ProductIds);
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
        await using var cmd = new SqlCommand("DELETE FROM ProductDiscounts WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) throw new InvalidOperationException("Data diskon produk tidak ditemukan.");
    }

    private static async Task<List<ProductDiscountProductDto>> LoadProductsAsync(
        SqlConnection connection, int discountId)
    {
        var products = new List<ProductDiscountProductDto>();
        await using var cmd = new SqlCommand(@"
            SELECT P.Id, P.ProductCode, P.ProductName, P.Unit, P.SellingPrice
            FROM ProductDiscountItems I
            INNER JOIN Products P ON I.ProductId = P.Id
            WHERE I.ProductDiscountId = @id
            ORDER BY P.ProductName", connection);
        cmd.Parameters.AddWithValue("@id", discountId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            products.Add(new ProductDiscountProductDto
            {
                ProductId = reader.GetInt32(0),
                ProductCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                ProductName = reader.GetString(2),
                Unit = reader.IsDBNull(3) ? null : reader.GetString(3),
                SellingPrice = reader.GetDecimal(4)
            });
        }

        return products;
    }

    private static async Task SaveProductsAsync(
        SqlConnection connection, SqlTransaction transaction, int discountId, List<int> productIds)
    {
        foreach (var productId in productIds.Distinct())
        {
            await using var cmd = new SqlCommand(@"
                INSERT INTO ProductDiscountItems (ProductDiscountId, ProductId)
                VALUES (@discountId, @productId)", connection, transaction);
            cmd.Parameters.AddWithValue("@discountId", discountId);
            cmd.Parameters.AddWithValue("@productId", productId);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    private static void AddHeaderParams(SqlCommand cmd, CreateProductDiscountRequestDto request)
    {
        cmd.Parameters.AddWithValue("@name", request.DiscountName.Trim());
        cmd.Parameters.AddWithValue("@type", request.DiscountType.Trim());
        cmd.Parameters.AddWithValue("@value", request.DiscountValue);
        cmd.Parameters.AddWithValue("@minPurchase", (object?)request.MinPurchaseAmount ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@startDate", request.StartDate);
        cmd.Parameters.AddWithValue("@endDate", (object?)request.EndDate ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@outletId", (object?)request.OutletId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@active", request.IsActive);
        cmd.Parameters.AddWithValue("@desc", (object?)request.Description?.Trim() ?? DBNull.Value);
    }

    private static ProductDiscountListItemDto MapListItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        DiscountName = reader.GetString(1),
        DiscountType = reader.GetString(2),
        DiscountValue = reader.GetDecimal(3),
        MinPurchaseAmount = reader.IsDBNull(4) ? null : reader.GetDecimal(4),
        StartDate = reader.GetDateTime(5),
        EndDate = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
        OutletId = reader.IsDBNull(7) ? null : reader.GetInt32(7),
        OutletName = reader.IsDBNull(8) ? null : reader.GetString(8),
        IsActive = reader.GetBoolean(9),
        Description = reader.IsDBNull(10) ? null : reader.GetString(10),
        ProductCount = reader.GetInt32(11),
        CreatedAt = reader.GetDateTime(12)
    };

    private static ProductDiscountDetailDto MapDetail(SqlDataReader reader)
    {
        var item = MapListItem(reader);
        return new ProductDiscountDetailDto
        {
            Id = item.Id,
            DiscountName = item.DiscountName,
            DiscountType = item.DiscountType,
            DiscountValue = item.DiscountValue,
            MinPurchaseAmount = item.MinPurchaseAmount,
            StartDate = item.StartDate,
            EndDate = item.EndDate,
            OutletId = item.OutletId,
            OutletName = item.OutletName,
            IsActive = item.IsActive,
            Description = item.Description,
            ProductCount = item.ProductCount,
            CreatedAt = item.CreatedAt
        };
    }
}
