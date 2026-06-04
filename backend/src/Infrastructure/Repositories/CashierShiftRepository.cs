using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class CashierShiftRepository : ICashierShiftRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public CashierShiftRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<CashierShiftFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var users = new List<CashierShiftUserDto>();

        await using var cmd = new SqlCommand(@"
            SELECT Id, FullName, Username
            FROM Users
            WHERE IsActive = 1
            ORDER BY FullName, Username", connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            users.Add(new CashierShiftUserDto
            {
                Id = reader.GetInt32(0),
                FullName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                Username = reader.IsDBNull(2) ? "" : reader.GetString(2)
            });
        }

        return new CashierShiftFormDataDto { Users = users };
    }

    public async Task<CashierShiftListResponseDto> GetAllAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var shifts = new List<CashierShiftListItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT S.Id, S.UserId, U.FullName, U.Username,
                   S.OpenTime, S.CloseTime, S.OpeningCash, S.ClosingCash
            FROM CashierShifts S
            INNER JOIN Users U ON S.UserId = U.Id
            ORDER BY S.OpenTime DESC", connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            shifts.Add(MapListItem(reader));
        }

        return new CashierShiftListResponseDto
        {
            Shifts = shifts,
            TotalCount = shifts.Count
        };
    }

    public async Task<CashierShiftDetailDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT S.Id, S.UserId, U.FullName, U.Username,
                   S.OpenTime, S.CloseTime, S.OpeningCash, S.ClosingCash
            FROM CashierShifts S
            INNER JOIN Users U ON S.UserId = U.Id
            WHERE S.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new CashierShiftDetailDto
        {
            Id = reader.GetInt64(0),
            UserId = reader.GetInt32(1),
            UserFullName = reader.IsDBNull(2) ? "" : reader.GetString(2),
            Username = reader.IsDBNull(3) ? "" : reader.GetString(3),
            OpenTime = reader.GetDateTime(4),
            CloseTime = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
            OpeningCash = reader.IsDBNull(6) ? null : reader.GetDecimal(6),
            ClosingCash = reader.IsDBNull(7) ? null : reader.GetDecimal(7)
        };
    }

    public async Task<bool> UserExistsAsync(int userId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Users WHERE Id = @id AND IsActive = 1", connection);
        cmd.Parameters.AddWithValue("@id", userId);
        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<bool> HasOpenShiftAsync(int userId, long? excludeId = null)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = "SELECT COUNT(1) FROM CashierShifts WHERE UserId = @userId AND CloseTime IS NULL";
        if (excludeId.HasValue)
            sql += " AND Id <> @excludeId";

        await using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@userId", userId);
        if (excludeId.HasValue)
            cmd.Parameters.AddWithValue("@excludeId", excludeId.Value);

        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<long> CreateAsync(CreateCashierShiftRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO CashierShifts (UserId, OpenTime, CloseTime, OpeningCash, ClosingCash)
            OUTPUT INSERTED.Id
            VALUES (@userId, @openTime, @closeTime, @openingCash, @closingCash)", connection);

        cmd.Parameters.AddWithValue("@userId", request.UserId);
        cmd.Parameters.AddWithValue("@openTime", request.OpenTime);
        cmd.Parameters.AddWithValue("@closeTime", (object?)request.CloseTime ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@openingCash", request.OpeningCash);
        cmd.Parameters.AddWithValue("@closingCash", (object?)request.ClosingCash ?? DBNull.Value);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    public async Task UpdateAsync(long id, UpdateCashierShiftRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            UPDATE CashierShifts
            SET UserId = @userId,
                OpenTime = @openTime,
                CloseTime = @closeTime,
                OpeningCash = @openingCash,
                ClosingCash = @closingCash
            WHERE Id = @id", connection);

        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@userId", request.UserId);
        cmd.Parameters.AddWithValue("@openTime", request.OpenTime);
        cmd.Parameters.AddWithValue("@closeTime", (object?)request.CloseTime ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@openingCash", request.OpeningCash);
        cmd.Parameters.AddWithValue("@closingCash", (object?)request.ClosingCash ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }

    private static CashierShiftListItemDto MapListItem(SqlDataReader reader) =>
        new()
        {
            Id = reader.GetInt64(0),
            UserId = reader.GetInt32(1),
            UserFullName = reader.IsDBNull(2) ? "" : reader.GetString(2),
            Username = reader.IsDBNull(3) ? "" : reader.GetString(3),
            OpenTime = reader.GetDateTime(4),
            CloseTime = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
            OpeningCash = reader.IsDBNull(6) ? null : reader.GetDecimal(6),
            ClosingCash = reader.IsDBNull(7) ? null : reader.GetDecimal(7)
        };
}
