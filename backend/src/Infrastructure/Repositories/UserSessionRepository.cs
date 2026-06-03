using LatihanASP.Domain.Entities;
using LatihanASP.Domain.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class UserSessionRepository : IUserSessionRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public UserSessionRepository(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task CreateAsync(UserSession session)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO user_sessions (user_id, access_token, refresh_token, ip_address, expired_at)
            VALUES (@userId, @accessToken, @refreshToken, @ip, @expiredAt)", connection);

        cmd.Parameters.AddWithValue("@userId", session.UserId);
        cmd.Parameters.AddWithValue("@accessToken", session.AccessToken);
        cmd.Parameters.AddWithValue("@refreshToken", (object?)session.RefreshToken ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@ip", (object?)session.IpAddress ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@expiredAt", (object?)session.ExpiredAt ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<User?> GetUserByAccessTokenAsync(string accessToken)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, u.profile_image,
                   u.is_verified, u.is_active, u.last_login, u.created_at, u.updated_at
            FROM user_sessions s
            INNER JOIN users u ON u.id = s.user_id
            WHERE s.access_token = @token
              AND (s.expired_at IS NULL OR s.expired_at > SYSUTCDATETIME())
              AND u.is_active = 1", connection);
        cmd.Parameters.AddWithValue("@token", accessToken);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new User
        {
            Id = reader.GetInt64(0),
            FullName = reader.GetString(1),
            Email = reader.GetString(2),
            Phone = reader.IsDBNull(3) ? null : reader.GetString(3),
            PasswordHash = reader.GetString(4),
            ProfileImage = reader.IsDBNull(5) ? null : reader.GetString(5),
            IsVerified = reader.GetBoolean(6),
            IsActive = reader.GetBoolean(7),
            LastLogin = reader.IsDBNull(8) ? null : reader.GetDateTime(8),
            CreatedAt = reader.GetDateTime(9),
            UpdatedAt = reader.GetDateTime(10)
        };
    }

    public async Task<bool> DeleteByAccessTokenAsync(string accessToken)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "DELETE FROM user_sessions WHERE access_token = @token", connection);
        cmd.Parameters.AddWithValue("@token", accessToken);
        return await cmd.ExecuteNonQueryAsync() > 0;
    }
}
