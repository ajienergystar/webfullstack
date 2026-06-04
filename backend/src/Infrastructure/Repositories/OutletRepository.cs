using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class OutletRepository : IOutletRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public OutletRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    private const string ReferenceCountSubquery = @"
        (SELECT COUNT(1) FROM SalesTransactions WHERE OutletId = O.Id) +
        (SELECT COUNT(1) FROM HeldTransactions WHERE OutletId = O.Id) +
        (SELECT COUNT(1) FROM Refunds WHERE OutletId = O.Id) +
        (SELECT COUNT(1) FROM CashAccounts WHERE OutletId = O.Id) +
        (SELECT COUNT(1) FROM CashTransactions WHERE OutletId = O.Id) +
        (SELECT COUNT(1) FROM Attendances WHERE OutletId = O.Id)";

    public async Task<OutletListResponseDto> GetListAsync(string? search)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = "";
        var cmd = new SqlCommand { Connection = connection };
        if (!string.IsNullOrWhiteSpace(search))
        {
            where = @"WHERE O.OutletName LIKE @search
                OR O.Address LIKE @search
                OR O.PhoneNumber LIKE @search";
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        cmd.CommandText = $@"
            SELECT O.Id, O.OutletName, O.Address, O.PhoneNumber,
                   {ReferenceCountSubquery} AS ReferenceCount
            FROM Outlets O
            {where}
            ORDER BY O.OutletName";

        var outlets = new List<OutletListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                outlets.Add(MapListItem(reader));
            }
        }

        return new OutletListResponseDto
        {
            Outlets = outlets,
            TotalCount = outlets.Count
        };
    }

    public async Task<OutletListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand($@"
            SELECT O.Id, O.OutletName, O.Address, O.PhoneNumber,
                   {ReferenceCountSubquery} AS ReferenceCount
            FROM Outlets O
            WHERE O.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return MapListItem(reader);
    }

    public async Task<OutletMutationResponseDto> CreateAsync(CreateOutletRequestDto request)
    {
        var name = request.OutletName.Trim();
        var address = NormalizeOptional(request.Address, 255);
        var phone = NormalizeOptional(request.PhoneNumber, 20);

        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await EnsureUniqueNameAsync(connection, name, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO Outlets (OutletName, Address, PhoneNumber)
            OUTPUT INSERTED.Id
            VALUES (@name, @address, @phone)", connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@address", (object?)address ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@phone", (object?)phone ?? DBNull.Value);

        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new OutletMutationResponseDto
        {
            Id = id,
            OutletName = name,
            Address = address,
            PhoneNumber = phone
        };
    }

    public async Task<OutletMutationResponseDto> UpdateAsync(int id, UpdateOutletRequestDto request)
    {
        var name = request.OutletName.Trim();
        var address = NormalizeOptional(request.Address, 255);
        var phone = NormalizeOptional(request.PhoneNumber, 20);

        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Cabang tidak ditemukan.");

        await EnsureUniqueNameAsync(connection, name, id);

        await using var cmd = new SqlCommand(@"
            UPDATE Outlets
            SET OutletName = @name, Address = @address, PhoneNumber = @phone
            WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@address", (object?)address ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@phone", (object?)phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new OutletMutationResponseDto
        {
            Id = id,
            OutletName = name,
            Address = address,
            PhoneNumber = phone
        };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Cabang tidak ditemukan.");

        var refCount = await CountReferencesAsync(connection, id);
        if (refCount > 0)
            throw new InvalidOperationException(
                $"Cabang masih dipakai di {refCount} data transaksi/keuangan. Hapus atau pindahkan data terkait terlebih dahulu.");

        await using var cmd = new SqlCommand("DELETE FROM Outlets WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static OutletListItemDto MapListItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        OutletName = reader.IsDBNull(1) ? "" : reader.GetString(1),
        Address = reader.IsDBNull(2) ? null : reader.GetString(2),
        PhoneNumber = reader.IsDBNull(3) ? null : reader.GetString(3),
        ReferenceCount = reader.GetInt32(4)
    };

    private static string? NormalizeOptional(string? value, int maxLen)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed.Length > maxLen ? trimmed[..maxLen] : trimmed;
    }

    private static async Task<bool> ExistsAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM Outlets WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task<int> CountReferencesAsync(SqlConnection connection, int outletId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT
                (SELECT COUNT(1) FROM SalesTransactions WHERE OutletId = @id) +
                (SELECT COUNT(1) FROM HeldTransactions WHERE OutletId = @id) +
                (SELECT COUNT(1) FROM Refunds WHERE OutletId = @id) +
                (SELECT COUNT(1) FROM CashAccounts WHERE OutletId = @id) +
                (SELECT COUNT(1) FROM CashTransactions WHERE OutletId = @id) +
                (SELECT COUNT(1) FROM Attendances WHERE OutletId = @id)", connection);
        cmd.Parameters.AddWithValue("@id", outletId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private static async Task EnsureUniqueNameAsync(
        SqlConnection connection, string name, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Outlets
            WHERE LOWER(OutletName) = LOWER(@name) AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Cabang '{name}' sudah ada.");
    }
}
