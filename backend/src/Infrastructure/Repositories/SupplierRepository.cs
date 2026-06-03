using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class SupplierRepository : ISupplierRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public SupplierRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<SupplierListResponseDto> GetListAsync(string? search)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = "";
        var cmd = new SqlCommand { Connection = connection };
        if (!string.IsNullOrWhiteSpace(search))
        {
            where = @"WHERE S.SupplierName LIKE @search OR S.Address LIKE @search
                      OR S.PhoneNumber LIKE @search OR S.Email LIKE @search";
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        cmd.CommandText = $@"
            SELECT S.Id, S.SupplierName, S.Address, S.PhoneNumber, S.Email,
                   (SELECT COUNT(1) FROM Purchases P WHERE P.SupplierId = S.Id) AS PurchaseCount
            FROM Suppliers S
            {where}
            ORDER BY S.SupplierName";

        var suppliers = new List<SupplierListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                suppliers.Add(MapItem(reader));
            }
        }

        return new SupplierListResponseDto
        {
            Suppliers = suppliers,
            TotalCount = suppliers.Count
        };
    }

    public async Task<SupplierListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT S.Id, S.SupplierName, S.Address, S.PhoneNumber, S.Email,
                   (SELECT COUNT(1) FROM Purchases P WHERE P.SupplierId = S.Id) AS PurchaseCount
            FROM Suppliers S
            WHERE S.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapItem(reader);
    }

    public async Task<SupplierMutationResponseDto> CreateAsync(CreateSupplierRequestDto request)
    {
        var name = request.SupplierName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await EnsureUniqueNameAsync(connection, name, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO Suppliers (SupplierName, Address, PhoneNumber, Email)
            OUTPUT INSERTED.Id
            VALUES (@name, @address, @phone, @email)", connection);
        AddParams(cmd, request, name);

        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new SupplierMutationResponseDto { Id = id, SupplierName = name };
    }

    public async Task<SupplierMutationResponseDto> UpdateAsync(int id, UpdateSupplierRequestDto request)
    {
        var name = request.SupplierName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Supplier tidak ditemukan.");

        await EnsureUniqueNameAsync(connection, name, id);

        await using var cmd = new SqlCommand(@"
            UPDATE Suppliers SET
                SupplierName = @name,
                Address = @address,
                PhoneNumber = @phone,
                Email = @email
            WHERE Id = @id", connection);
        AddParams(cmd, request, name);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new SupplierMutationResponseDto { Id = id, SupplierName = name };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Supplier tidak ditemukan.");

        var purchaseCount = await CountPurchasesAsync(connection, id);
        if (purchaseCount > 0)
            throw new InvalidOperationException(
                $"Supplier masih dipakai pada {purchaseCount} transaksi pembelian.");

        await using var cmd = new SqlCommand("DELETE FROM Suppliers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static SupplierListItemDto MapItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        SupplierName = reader.IsDBNull(1) ? "" : reader.GetString(1),
        Address = reader.IsDBNull(2) ? null : reader.GetString(2),
        PhoneNumber = reader.IsDBNull(3) ? null : reader.GetString(3),
        Email = reader.IsDBNull(4) ? null : reader.GetString(4),
        PurchaseCount = reader.GetInt32(5)
    };

    private static void AddParams(SqlCommand cmd, CreateSupplierRequestDto request, string name)
    {
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@address",
            string.IsNullOrWhiteSpace(request.Address) ? DBNull.Value : request.Address.Trim());
        cmd.Parameters.AddWithValue("@phone",
            string.IsNullOrWhiteSpace(request.PhoneNumber) ? DBNull.Value : request.PhoneNumber.Trim());
        cmd.Parameters.AddWithValue("@email",
            string.IsNullOrWhiteSpace(request.Email) ? DBNull.Value : request.Email.Trim());
    }

    private static async Task<bool> ExistsAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM Suppliers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task<int> CountPurchasesAsync(SqlConnection connection, int supplierId)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Purchases WHERE SupplierId = @id", connection);
        cmd.Parameters.AddWithValue("@id", supplierId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private static async Task EnsureUniqueNameAsync(
        SqlConnection connection, string name, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Suppliers
            WHERE LOWER(SupplierName) = LOWER(@name) AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Supplier '{name}' sudah ada.");
    }
}
