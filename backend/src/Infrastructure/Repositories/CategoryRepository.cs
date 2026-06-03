using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public CategoryRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<CategoryListResponseDto> GetListAsync(string? search)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = "";
        var cmd = new SqlCommand { Connection = connection };
        if (!string.IsNullOrWhiteSpace(search))
        {
            where = "WHERE C.CategoryName LIKE @search";
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        cmd.CommandText = $@"
            SELECT C.Id, C.CategoryName,
                   (SELECT COUNT(1) FROM Products P WHERE P.CategoryId = C.Id) AS ProductCount
            FROM Categories C
            {where}
            ORDER BY C.CategoryName";

        var categories = new List<CategoryListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                categories.Add(new CategoryListItemDto
                {
                    Id = reader.GetInt32(0),
                    CategoryName = reader.GetString(1),
                    ProductCount = reader.GetInt32(2)
                });
            }
        }

        return new CategoryListResponseDto
        {
            Categories = categories,
            TotalCount = categories.Count
        };
    }

    public async Task<CategoryListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT C.Id, C.CategoryName,
                   (SELECT COUNT(1) FROM Products P WHERE P.CategoryId = C.Id) AS ProductCount
            FROM Categories C
            WHERE C.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new CategoryListItemDto
        {
            Id = reader.GetInt32(0),
            CategoryName = reader.GetString(1),
            ProductCount = reader.GetInt32(2)
        };
    }

    public async Task<CategoryMutationResponseDto> CreateAsync(CreateCategoryRequestDto request)
    {
        var name = request.CategoryName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await EnsureUniqueNameAsync(connection, name, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO Categories (CategoryName)
            OUTPUT INSERTED.Id
            VALUES (@name)", connection);
        cmd.Parameters.AddWithValue("@name", name);

        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new CategoryMutationResponseDto { Id = id, CategoryName = name };
    }

    public async Task<CategoryMutationResponseDto> UpdateAsync(int id, UpdateCategoryRequestDto request)
    {
        var name = request.CategoryName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Kategori tidak ditemukan.");

        await EnsureUniqueNameAsync(connection, name, id);

        await using var cmd = new SqlCommand(
            "UPDATE Categories SET CategoryName = @name WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new CategoryMutationResponseDto { Id = id, CategoryName = name };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Kategori tidak ditemukan.");

        var productCount = await CountProductsAsync(connection, id);
        if (productCount > 0)
            throw new InvalidOperationException(
                $"Kategori masih dipakai oleh {productCount} produk. Pindahkan atau hapus produk terlebih dahulu.");

        await using var cmd = new SqlCommand("DELETE FROM Categories WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<bool> ExistsAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM Categories WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task<int> CountProductsAsync(SqlConnection connection, int categoryId)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Products WHERE CategoryId = @id", connection);
        cmd.Parameters.AddWithValue("@id", categoryId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private static async Task EnsureUniqueNameAsync(
        SqlConnection connection, string name, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Categories
            WHERE LOWER(CategoryName) = LOWER(@name) AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Kategori '{name}' sudah ada.");
    }
}
