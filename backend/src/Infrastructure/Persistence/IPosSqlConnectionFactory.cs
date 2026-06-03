using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Persistence;

public interface IPosSqlConnectionFactory
{
    Task<SqlConnection> CreateConnectionAsync();
}
