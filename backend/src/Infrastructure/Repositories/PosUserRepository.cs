using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class PosUserRepository : IPosUserRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public PosUserRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<PosUserFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var roles = new List<PosRoleDto>();

        await using var cmd = new SqlCommand(
            "SELECT Id, RoleName FROM Roles ORDER BY RoleName", connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            roles.Add(new PosRoleDto
            {
                Id = reader.GetInt32(0),
                RoleName = reader.GetString(1)
            });
        }

        return new PosUserFormDataDto { Roles = roles };
    }

    public async Task<PosUserListResponseDto> GetAllAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var users = new List<PosUserListItemDto>();

        await using var cmd = new SqlCommand(@"
            SELECT U.Id, U.FullName, U.Username, U.RoleId, R.RoleName, U.IsActive, U.CreatedAt
            FROM Users U
            LEFT JOIN Roles R ON U.RoleId = R.Id
            ORDER BY U.FullName, U.Username", connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            users.Add(new PosUserListItemDto
            {
                Id = reader.GetInt32(0),
                FullName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                Username = reader.IsDBNull(2) ? "" : reader.GetString(2),
                RoleId = reader.IsDBNull(3) ? null : reader.GetInt32(3),
                RoleName = reader.IsDBNull(4) ? "" : reader.GetString(4),
                IsActive = reader.GetBoolean(5),
                CreatedAt = reader.GetDateTime(6)
            });
        }

        return new PosUserListResponseDto
        {
            Users = users,
            TotalCount = users.Count
        };
    }

    public async Task<PosUserDetailDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT U.Id, U.FullName, U.Username, U.RoleId, R.RoleName, U.IsActive, U.CreatedAt
            FROM Users U
            LEFT JOIN Roles R ON U.RoleId = R.Id
            WHERE U.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new PosUserDetailDto
        {
            Id = reader.GetInt32(0),
            FullName = reader.IsDBNull(1) ? "" : reader.GetString(1),
            Username = reader.IsDBNull(2) ? "" : reader.GetString(2),
            RoleId = reader.IsDBNull(3) ? null : reader.GetInt32(3),
            RoleName = reader.IsDBNull(4) ? "" : reader.GetString(4),
            IsActive = reader.GetBoolean(5),
            CreatedAt = reader.GetDateTime(6)
        };
    }

    public async Task<bool> UsernameExistsAsync(string username, int? excludeId = null)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = "SELECT COUNT(1) FROM Users WHERE Username = @username";
        if (excludeId.HasValue)
            sql += " AND Id <> @excludeId";

        await using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@username", username);
        if (excludeId.HasValue)
            cmd.Parameters.AddWithValue("@excludeId", excludeId.Value);

        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<bool> RoleExistsAsync(int roleId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Roles WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", roleId);
        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<int> CreateAsync(CreatePosUserRequestDto request, string passwordHash)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO Users (FullName, Username, PasswordHash, RoleId, IsActive)
            OUTPUT INSERTED.Id
            VALUES (@fullName, @username, @passwordHash, @roleId, @isActive)", connection);

        cmd.Parameters.AddWithValue("@fullName", request.FullName.Trim());
        cmd.Parameters.AddWithValue("@username", request.Username.Trim());
        cmd.Parameters.AddWithValue("@passwordHash", passwordHash);
        cmd.Parameters.AddWithValue("@roleId", request.RoleId);
        cmd.Parameters.AddWithValue("@isActive", request.IsActive);

        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    public async Task UpdateAsync(int id, UpdatePosUserRequestDto request, string? passwordHash)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var sql = @"
            UPDATE Users
            SET FullName = @fullName,
                Username = @username,
                RoleId = @roleId,
                IsActive = @isActive";

        if (passwordHash is not null)
            sql += ", PasswordHash = @passwordHash";

        sql += " WHERE Id = @id";

        await using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@fullName", request.FullName.Trim());
        cmd.Parameters.AddWithValue("@username", request.Username.Trim());
        cmd.Parameters.AddWithValue("@roleId", request.RoleId);
        cmd.Parameters.AddWithValue("@isActive", request.IsActive);
        if (passwordHash is not null)
            cmd.Parameters.AddWithValue("@passwordHash", passwordHash);

        await cmd.ExecuteNonQueryAsync();
    }
}
