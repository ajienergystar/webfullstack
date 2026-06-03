using LatihanASP.Domain.Entities;
using LatihanASP.Domain.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public UserRepository(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand("SELECT COUNT(1) FROM users WHERE email = @email", connection);
        cmd.Parameters.AddWithValue("@email", email);
        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<long> CreateAsync(User user)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO users (full_name, email, phone, password_hash)
            OUTPUT INSERTED.id
            VALUES (@fullName, @email, @phone, @passwordHash)", connection);

        cmd.Parameters.AddWithValue("@fullName", user.FullName);
        cmd.Parameters.AddWithValue("@email", user.Email);
        cmd.Parameters.AddWithValue("@phone", (object?)user.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@passwordHash", user.PasswordHash);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT id, full_name, email, phone, password_hash, profile_image,
                   is_verified, is_active, last_login, created_at, updated_at
            FROM users WHERE email = @email", connection);
        cmd.Parameters.AddWithValue("@email", email);

        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? MapUser(reader) : null;
    }

    public async Task<User?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT id, full_name, email, phone, password_hash, profile_image,
                   is_verified, is_active, last_login, created_at, updated_at
            FROM users WHERE id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? MapUser(reader) : null;
    }

    public async Task UpdateLastLoginAsync(long userId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "UPDATE users SET last_login = SYSUTCDATETIME() WHERE id = @id", connection);
        cmd.Parameters.AddWithValue("@id", userId);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task UpdatePasswordHashAsync(long userId, string passwordHash)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "UPDATE users SET password_hash = @hash WHERE id = @id", connection);
        cmd.Parameters.AddWithValue("@hash", passwordHash);
        cmd.Parameters.AddWithValue("@id", userId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static User MapUser(SqlDataReader reader) => new()
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
