using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace LatihanASP.Infrastructure.Persistence;

public class PosSqlConnectionFactory : IPosSqlConnectionFactory
{
    private readonly string _connectionString;

    public PosSqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("PosConnection")
            ?? throw new InvalidOperationException("Connection string 'PosConnection' not found.");
    }

    public async Task<SqlConnection> CreateConnectionAsync()
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }
}
