using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class AttendanceRepository : IAttendanceRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public AttendanceRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<AttendanceFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var users = new List<AttendanceUserDto>();
        var outlets = new List<AttendanceOutletDto>();

        await using (var cmd = new SqlCommand(@"
            SELECT Id, FullName, Username
            FROM Users
            WHERE IsActive = 1
            ORDER BY FullName, Username", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                users.Add(new AttendanceUserDto
                {
                    Id = reader.GetInt32(0),
                    FullName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    Username = reader.IsDBNull(2) ? "" : reader.GetString(2)
                });
            }
        }

        await using (var cmd = new SqlCommand(@"
            SELECT Id, OutletName
            FROM Outlets
            ORDER BY OutletName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                outlets.Add(new AttendanceOutletDto
                {
                    Id = reader.GetInt32(0),
                    OutletName = reader.IsDBNull(1) ? "" : reader.GetString(1)
                });
            }
        }

        return new AttendanceFormDataDto { Users = users, Outlets = outlets };
    }

    public async Task<AttendanceListResponseDto> GetAllAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var records = new List<AttendanceListItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT A.Id, A.UserId, U.FullName, U.Username,
                   A.OutletId, O.OutletName,
                   A.AttendanceDate, A.ClockIn, A.ClockOut,
                   A.Status, A.Notes, A.CreatedAt
            FROM Attendances A
            INNER JOIN Users U ON A.UserId = U.Id
            LEFT JOIN Outlets O ON A.OutletId = O.Id
            ORDER BY A.AttendanceDate DESC, A.ClockIn DESC", connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            records.Add(MapListItem(reader));
        }

        return new AttendanceListResponseDto
        {
            Records = records,
            TotalCount = records.Count
        };
    }

    public async Task<AttendanceDetailDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT A.Id, A.UserId, U.FullName, U.Username,
                   A.OutletId, O.OutletName,
                   A.AttendanceDate, A.ClockIn, A.ClockOut,
                   A.Status, A.Notes, A.CreatedAt
            FROM Attendances A
            INNER JOIN Users U ON A.UserId = U.Id
            LEFT JOIN Outlets O ON A.OutletId = O.Id
            WHERE A.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return MapDetail(reader);
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

    public async Task<bool> OutletExistsAsync(int outletId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Outlets WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", outletId);
        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<long> CreateAsync(CreateAttendanceRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO Attendances (UserId, OutletId, AttendanceDate, ClockIn, ClockOut, Status, Notes)
            OUTPUT INSERTED.Id
            VALUES (@userId, @outletId, @attendanceDate, @clockIn, @clockOut, @status, @notes)", connection);

        AddParameters(cmd, request.UserId, request.OutletId, request.AttendanceDate,
            request.ClockIn, request.ClockOut, request.Status, request.Notes);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    public async Task UpdateAsync(long id, UpdateAttendanceRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            UPDATE Attendances
            SET UserId = @userId,
                OutletId = @outletId,
                AttendanceDate = @attendanceDate,
                ClockIn = @clockIn,
                ClockOut = @clockOut,
                Status = @status,
                Notes = @notes
            WHERE Id = @id", connection);

        cmd.Parameters.AddWithValue("@id", id);
        AddParameters(cmd, request.UserId, request.OutletId, request.AttendanceDate,
            request.ClockIn, request.ClockOut, request.Status, request.Notes);

        await cmd.ExecuteNonQueryAsync();
    }

    private static void AddParameters(SqlCommand cmd, int userId, int? outletId,
        DateOnly attendanceDate, DateTime clockIn, DateTime? clockOut, string status, string? notes)
    {
        cmd.Parameters.AddWithValue("@userId", userId);
        cmd.Parameters.AddWithValue("@outletId", (object?)outletId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@attendanceDate", attendanceDate.ToDateTime(TimeOnly.MinValue));
        cmd.Parameters.AddWithValue("@clockIn", clockIn);
        cmd.Parameters.AddWithValue("@clockOut", (object?)clockOut ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@status", status);
        cmd.Parameters.AddWithValue("@notes", (object?)notes ?? DBNull.Value);
    }

    private static AttendanceListItemDto MapListItem(SqlDataReader reader) =>
        new()
        {
            Id = reader.GetInt64(0),
            UserId = reader.GetInt32(1),
            UserFullName = reader.IsDBNull(2) ? "" : reader.GetString(2),
            Username = reader.IsDBNull(3) ? "" : reader.GetString(3),
            OutletId = reader.IsDBNull(4) ? null : reader.GetInt32(4),
            OutletName = reader.IsDBNull(5) ? "" : reader.GetString(5),
            AttendanceDate = DateOnly.FromDateTime(reader.GetDateTime(6)),
            ClockIn = reader.GetDateTime(7),
            ClockOut = reader.IsDBNull(8) ? null : reader.GetDateTime(8),
            Status = reader.IsDBNull(9) ? "" : reader.GetString(9),
            Notes = reader.IsDBNull(10) ? null : reader.GetString(10),
            CreatedAt = reader.GetDateTime(11)
        };

    private static AttendanceDetailDto MapDetail(SqlDataReader reader) =>
        new()
        {
            Id = reader.GetInt64(0),
            UserId = reader.GetInt32(1),
            UserFullName = reader.IsDBNull(2) ? "" : reader.GetString(2),
            Username = reader.IsDBNull(3) ? "" : reader.GetString(3),
            OutletId = reader.IsDBNull(4) ? null : reader.GetInt32(4),
            OutletName = reader.IsDBNull(5) ? "" : reader.GetString(5),
            AttendanceDate = DateOnly.FromDateTime(reader.GetDateTime(6)),
            ClockIn = reader.GetDateTime(7),
            ClockOut = reader.IsDBNull(8) ? null : reader.GetDateTime(8),
            Status = reader.IsDBNull(9) ? "" : reader.GetString(9),
            Notes = reader.IsDBNull(10) ? null : reader.GetString(10),
            CreatedAt = reader.GetDateTime(11)
        };
}
