using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class VoucherRepository : IVoucherRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public VoucherRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<VoucherListResponseDto> GetListAsync(string? search, bool? isActive)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var conditions = new List<string>();
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add("V.VoucherCode LIKE @search");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (isActive.HasValue)
        {
            conditions.Add("V.IsActive = @isActive");
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);
        }

        var where = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";

        cmd.CommandText = $@"
            SELECT V.Id, V.VoucherCode, V.DiscountAmount, V.ExpiredDate, V.IsActive
            FROM Vouchers V
            {where}
            ORDER BY V.VoucherCode";

        var vouchers = new List<VoucherListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                vouchers.Add(MapItem(reader));
            }
        }

        return new VoucherListResponseDto
        {
            Vouchers = vouchers,
            TotalCount = vouchers.Count,
            ActiveCount = vouchers.Count(v => v.IsActive && !v.IsExpired)
        };
    }

    public async Task<VoucherListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT Id, VoucherCode, DiscountAmount, ExpiredDate, IsActive
            FROM Vouchers
            WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapItem(reader);
    }

    public async Task<VoucherMutationResponseDto> CreateAsync(CreateVoucherRequestDto request)
    {
        var code = request.VoucherCode.Trim().ToUpperInvariant();
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await EnsureUniqueCodeAsync(connection, code, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO Vouchers (VoucherCode, DiscountAmount, ExpiredDate, IsActive)
            OUTPUT INSERTED.Id
            VALUES (@code, @amount, @expired, @active)", connection);
        AddParams(cmd, request, code);

        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new VoucherMutationResponseDto { Id = id, VoucherCode = code };
    }

    public async Task<VoucherMutationResponseDto> UpdateAsync(int id, UpdateVoucherRequestDto request)
    {
        var code = request.VoucherCode.Trim().ToUpperInvariant();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Voucher tidak ditemukan.");

        await EnsureUniqueCodeAsync(connection, code, id);

        await using var cmd = new SqlCommand(@"
            UPDATE Vouchers SET
                VoucherCode = @code,
                DiscountAmount = @amount,
                ExpiredDate = @expired,
                IsActive = @active
            WHERE Id = @id", connection);
        AddParams(cmd, request, code);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new VoucherMutationResponseDto { Id = id, VoucherCode = code };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Voucher tidak ditemukan.");

        await using var cmd = new SqlCommand("DELETE FROM Vouchers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static VoucherListItemDto MapItem(SqlDataReader reader)
    {
        var expiredDate = reader.IsDBNull(3) ? (DateTime?)null : reader.GetDateTime(3);
        return new VoucherListItemDto
        {
            Id = reader.GetInt32(0),
            VoucherCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
            DiscountAmount = reader.IsDBNull(2) ? null : reader.GetDecimal(2),
            ExpiredDate = expiredDate,
            IsActive = reader.GetBoolean(4),
            IsExpired = expiredDate.HasValue && expiredDate.Value < DateTime.UtcNow
        };
    }

    private static void AddParams(SqlCommand cmd, CreateVoucherRequestDto request, string code)
    {
        cmd.Parameters.AddWithValue("@code", code);
        cmd.Parameters.AddWithValue("@amount", request.DiscountAmount!.Value);
        cmd.Parameters.AddWithValue("@expired",
            request.ExpiredDate.HasValue ? request.ExpiredDate.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@active", request.IsActive);
    }

    private static async Task<bool> ExistsAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM Vouchers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task EnsureUniqueCodeAsync(
        SqlConnection connection, string code, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Vouchers
            WHERE VoucherCode = @code AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@code", code);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Kode voucher '{code}' sudah terdaftar.");
    }
}
