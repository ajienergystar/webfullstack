using LatihanASP.Domain.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class PasswordResetRepository : IPasswordResetRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public PasswordResetRepository(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task CreateAsync(long userId, string resetToken, DateTime expiredAt)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO password_resets (user_id, reset_token, expired_at)
            VALUES (@userId, @token, @expiredAt)", connection);

        cmd.Parameters.AddWithValue("@userId", userId);
        cmd.Parameters.AddWithValue("@token", resetToken);
        cmd.Parameters.AddWithValue("@expiredAt", expiredAt);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<long?> GetValidUserIdByTokenAsync(string resetToken)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT user_id FROM password_resets
            WHERE reset_token = @token
              AND used = 0
              AND expired_at > SYSUTCDATETIME()", connection);
        cmd.Parameters.AddWithValue("@token", resetToken);

        var result = await cmd.ExecuteScalarAsync();
        return result is null or DBNull ? null : Convert.ToInt64(result);
    }

    public async Task MarkAsUsedAsync(string resetToken)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "UPDATE password_resets SET used = 1 WHERE reset_token = @token", connection);
        cmd.Parameters.AddWithValue("@token", resetToken);
        await cmd.ExecuteNonQueryAsync();
    }
}
