using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class BrandRepository : IBrandRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public BrandRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<BrandListResponseDto> GetListAsync(string? search, bool? isActive)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(B.BrandName LIKE @search OR B.Description LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (isActive.HasValue)
        {
            where.Add("B.IsActive = @isActive");
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);
        }

        cmd.CommandText = $@"
            SELECT B.Id, B.BrandName, B.Description, B.IsActive,
                   (SELECT COUNT(1) FROM Products P WHERE P.BrandId = B.Id) AS ProductCount
            FROM Brands B
            WHERE {string.Join(" AND ", where)}
            ORDER BY B.BrandName";

        var brands = new List<BrandListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                brands.Add(MapItem(reader));
            }
        }

        return new BrandListResponseDto
        {
            Brands = brands,
            TotalCount = brands.Count,
            ActiveCount = brands.Count(b => b.IsActive)
        };
    }

    public async Task<BrandListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT B.Id, B.BrandName, B.Description, B.IsActive,
                   (SELECT COUNT(1) FROM Products P WHERE P.BrandId = B.Id) AS ProductCount
            FROM Brands B
            WHERE B.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapItem(reader);
    }

    public async Task<BrandMutationResponseDto> CreateAsync(CreateBrandRequestDto request)
    {
        var name = request.BrandName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await EnsureUniqueNameAsync(connection, name, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO Brands (BrandName, Description, IsActive)
            OUTPUT INSERTED.Id
            VALUES (@name, @desc, @active)", connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@desc",
            string.IsNullOrWhiteSpace(request.Description) ? DBNull.Value : request.Description.Trim());
        cmd.Parameters.AddWithValue("@active", request.IsActive);

        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new BrandMutationResponseDto { Id = id, BrandName = name };
    }

    public async Task<BrandMutationResponseDto> UpdateAsync(int id, UpdateBrandRequestDto request)
    {
        var name = request.BrandName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Brand tidak ditemukan.");

        await EnsureUniqueNameAsync(connection, name, id);

        await using var cmd = new SqlCommand(@"
            UPDATE Brands SET
                BrandName = @name,
                Description = @desc,
                IsActive = @active
            WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@desc",
            string.IsNullOrWhiteSpace(request.Description) ? DBNull.Value : request.Description.Trim());
        cmd.Parameters.AddWithValue("@active", request.IsActive);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new BrandMutationResponseDto { Id = id, BrandName = name };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Brand tidak ditemukan.");

        var productCount = await CountProductsAsync(connection, id);
        if (productCount > 0)
            throw new InvalidOperationException(
                $"Brand masih dipakai oleh {productCount} produk. Pindahkan produk terlebih dahulu.");

        await using var cmd = new SqlCommand("DELETE FROM Brands WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static BrandListItemDto MapItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        BrandName = reader.GetString(1),
        Description = reader.IsDBNull(2) ? null : reader.GetString(2),
        IsActive = reader.GetBoolean(3),
        ProductCount = reader.GetInt32(4)
    };

    private static async Task<bool> ExistsAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM Brands WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task<int> CountProductsAsync(SqlConnection connection, int brandId)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Products WHERE BrandId = @id", connection);
        cmd.Parameters.AddWithValue("@id", brandId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private static async Task EnsureUniqueNameAsync(
        SqlConnection connection, string name, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Brands
            WHERE LOWER(BrandName) = LOWER(@name) AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Brand '{name}' sudah ada.");
    }
}
