using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public AuditLogRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<AuditLogListResponseDto> GetListAsync(
        string? search,
        DateTime? dateFrom,
        DateTime? dateTo,
        int? userId,
        string? tableName)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (dateFrom.HasValue)
        {
            where.Add("CAST(A.CreatedAt AS DATE) >= @dateFrom");
            cmd.Parameters.AddWithValue("@dateFrom", dateFrom.Value.Date);
        }

        if (dateTo.HasValue)
        {
            where.Add("CAST(A.CreatedAt AS DATE) <= @dateTo");
            cmd.Parameters.AddWithValue("@dateTo", dateTo.Value.Date);
        }

        if (userId.HasValue)
        {
            where.Add("A.UserId = @userId");
            cmd.Parameters.AddWithValue("@userId", userId.Value);
        }

        if (!string.IsNullOrWhiteSpace(tableName))
        {
            where.Add("A.TableName = @tableName");
            cmd.Parameters.AddWithValue("@tableName", tableName.Trim());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(A.Action LIKE @search OR A.TableName LIKE @search OR ISNULL(U.FullName, '') LIKE @search OR ISNULL(U.Username, '') LIKE @search OR CAST(A.RecordId AS NVARCHAR(20)) LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        var whereClause = string.Join(" AND ", where);

        cmd.CommandText = $@"
            SELECT
                A.Id,
                A.UserId,
                ISNULL(U.FullName, 'Sistem') AS UserFullName,
                U.Username,
                A.Action,
                A.TableName,
                A.RecordId,
                A.CreatedAt
            FROM AuditLogs A
            LEFT JOIN Users U ON A.UserId = U.Id
            WHERE {whereClause}
            ORDER BY A.CreatedAt DESC";

        var logs = new List<AuditLogListItemDto>();
        var uniqueUsers = new HashSet<int?>();
        var uniqueTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var today = DateTime.UtcNow.Date;
        var todayCount = 0;

        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                int? logUserId = reader.IsDBNull(1) ? null : reader.GetInt32(1);
                var table = reader.IsDBNull(5) ? null : reader.GetString(5);
                var createdAt = reader.GetDateTime(7);

                uniqueUsers.Add(logUserId);
                if (!string.IsNullOrWhiteSpace(table))
                {
                    uniqueTables.Add(table);
                }

                if (createdAt.Date == today)
                {
                    todayCount++;
                }

                logs.Add(new AuditLogListItemDto
                {
                    Id = reader.GetInt64(0),
                    UserId = logUserId,
                    UserFullName = reader.GetString(2),
                    Username = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Action = reader.GetString(4),
                    TableName = table,
                    RecordId = reader.IsDBNull(6) ? null : reader.GetInt64(6),
                    CreatedAt = createdAt,
                });
            }
        }

        var tableNames = await LoadDistinctTableNamesAsync(connection);

        return new AuditLogListResponseDto
        {
            Logs = logs,
            TotalCount = logs.Count,
            TodayCount = todayCount,
            UniqueUserCount = uniqueUsers.Count(u => u.HasValue),
            TableNames = tableNames.Count > 0 ? tableNames : uniqueTables.OrderBy(t => t).ToList(),
        };
    }

    private static async Task<List<string>> LoadDistinctTableNamesAsync(SqlConnection connection)
    {
        var list = new List<string>();

        await using var cmd = new SqlCommand(@"
            SELECT DISTINCT TableName
            FROM AuditLogs
            WHERE TableName IS NOT NULL AND LTRIM(RTRIM(TableName)) <> ''
            ORDER BY TableName", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(reader.GetString(0));
        }

        return list;
    }
}
