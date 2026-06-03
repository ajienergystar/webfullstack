using LatihanASP.Domain.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class EmailVerificationRepository : IEmailVerificationRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public EmailVerificationRepository(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task CreateAsync(long userId, string verificationCode, DateTime expiredAt)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO email_verifications (user_id, verification_code, expired_at)
            VALUES (@userId, @code, @expiredAt)", connection);

        cmd.Parameters.AddWithValue("@userId", userId);
        cmd.Parameters.AddWithValue("@code", verificationCode);
        cmd.Parameters.AddWithValue("@expiredAt", expiredAt);

        await cmd.ExecuteNonQueryAsync();
    }
}
