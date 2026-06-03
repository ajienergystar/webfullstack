using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Persistence;

public interface ISqlConnectionFactory
{
    Task<SqlConnection> CreateConnectionAsync();
}
