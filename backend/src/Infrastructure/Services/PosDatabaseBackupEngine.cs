using System.Text.Json;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Services;

public class PosDatabaseBackupEngine : IPosDatabaseBackupEngine
{
    private static readonly string[] ExcludedTables = ["DatabaseBackups"];

    private readonly IPosSqlConnectionFactory _connectionFactory;

    public PosDatabaseBackupEngine(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task ExportToFileAsync(string filePath)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var tables = await GetExportableTablesAsync(connection);

        var payload = new Dictionary<string, object?>
        {
            ["version"] = "1.0",
            ["database"] = connection.Database,
            ["exportedAt"] = DateTime.UtcNow,
            ["tables"] = new Dictionary<string, JsonElement>()
        };

        var tablesDict = (Dictionary<string, JsonElement>)payload["tables"]!;

        foreach (var table in tables)
        {
            await using var cmd = new SqlCommand(
                $"SELECT * FROM [{table}] FOR JSON PATH, INCLUDE_NULL_VALUES", connection);
            var json = await cmd.ExecuteScalarAsync() as string;
            tablesDict[table] = string.IsNullOrWhiteSpace(json)
                ? JsonSerializer.Deserialize<JsonElement>("[]")!
                : JsonSerializer.Deserialize<JsonElement>(json)!;
        }

        var options = new JsonSerializerOptions { WriteIndented = true };
        await File.WriteAllTextAsync(filePath, JsonSerializer.Serialize(payload, options));
    }

    public Task<(bool Success, int TablesRestored, string Message)> RestoreFromFileAsync(string filePath)
        => RestoreFromStreamAsync(File.OpenRead(filePath));

    public async Task<(bool Success, int TablesRestored, string Message)> RestoreFromStreamAsync(Stream stream)
    {
        using var reader = new StreamReader(stream);
        var json = await reader.ReadToEndAsync();

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!root.TryGetProperty("tables", out var tablesElement) ||
            tablesElement.ValueKind != JsonValueKind.Object)
        {
            return (false, 0, "Format backup tidak valid. Properti 'tables' tidak ditemukan.");
        }

        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var tableNames = tablesElement.EnumerateObject()
                .Select(p => p.Name)
                .Where(t => !ExcludedTables.Contains(t))
                .ToList();

            var allTables = await GetExportableTablesAsync(connection, transaction);
            var deleteOrder = allTables
                .Where(t => !ExcludedTables.Contains(t))
                .Reverse()
                .ToList();

            await DisableConstraintsAsync(connection, transaction);

            foreach (var table in deleteOrder)
            {
                await using var deleteCmd = new SqlCommand($"DELETE FROM [{table}]", connection, transaction);
                await deleteCmd.ExecuteNonQueryAsync();
            }

            var restoredCount = 0;
            foreach (var table in allTables.Where(t => tableNames.Contains(t)))
            {
                if (!tablesElement.TryGetProperty(table, out var rows) ||
                    rows.ValueKind != JsonValueKind.Array)
                    continue;

                var rowCount = await InsertRowsAsync(connection, transaction, table, rows);
                if (rowCount > 0) restoredCount++;
            }

            await EnableConstraintsAsync(connection, transaction);
            await transaction.CommitAsync();

            return (true, restoredCount, $"Restore berhasil. {restoredCount} tabel dipulihkan.");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (false, 0, $"Restore gagal: {ex.Message}");
        }
    }

    private static async Task<List<string>> GetExportableTablesAsync(
        SqlConnection connection, SqlTransaction? transaction = null)
    {
        await using var cmd = new SqlCommand(@"
            SELECT t.name
            FROM sys.tables t
            WHERE t.is_ms_shipped = 0
              AND t.name NOT IN ('DatabaseBackups')
            ORDER BY t.name", connection, transaction);

        var tables = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            tables.Add(reader.GetString(0));
        }

        return tables;
    }

    private static async Task DisableConstraintsAsync(SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(@"
            EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'", connection, transaction);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task EnableConstraintsAsync(SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(@"
            EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'", connection, transaction);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<int> InsertRowsAsync(
        SqlConnection connection, SqlTransaction transaction, string table, JsonElement rows)
    {
        var inserted = 0;
        var hasIdentity = await HasIdentityColumnAsync(connection, transaction, table);

        if (hasIdentity)
        {
            await using var identityOn = new SqlCommand(
                $"SET IDENTITY_INSERT [{table}] ON", connection, transaction);
            await identityOn.ExecuteNonQueryAsync();
        }

        foreach (var row in rows.EnumerateArray())
        {
            var columns = row.EnumerateObject().ToList();
            if (columns.Count == 0) continue;

            var colNames = columns.Select(c => $"[{c.Name}]").ToList();
            var paramNames = columns.Select((c, i) => $"@p{i}").ToList();

            await using var cmd = new SqlCommand(
                $"INSERT INTO [{table}] ({string.Join(", ", colNames)}) VALUES ({string.Join(", ", paramNames)})",
                connection, transaction);

            for (var i = 0; i < columns.Count; i++)
            {
                cmd.Parameters.AddWithValue($"@p{i}", JsonElementToSqlValue(columns[i].Value));
            }

            await cmd.ExecuteNonQueryAsync();
            inserted++;
        }

        if (hasIdentity)
        {
            await using var identityOff = new SqlCommand(
                $"SET IDENTITY_INSERT [{table}] OFF", connection, transaction);
            await identityOff.ExecuteNonQueryAsync();
        }

        return inserted > 0 ? 1 : 0;
    }

    private static async Task<bool> HasIdentityColumnAsync(
        SqlConnection connection, SqlTransaction transaction, string table)
    {
        await using var cmd = new SqlCommand(@"
            SELECT COUNT(1)
            FROM sys.columns c
            INNER JOIN sys.tables t ON t.object_id = c.object_id
            WHERE t.name = @table AND c.is_identity = 1", connection, transaction);
        cmd.Parameters.AddWithValue("@table", table);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
    }

    private static object JsonElementToSqlValue(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Null => DBNull.Value,
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Number when element.TryGetInt64(out var l) => l,
        JsonValueKind.Number => element.GetDecimal(),
        JsonValueKind.String when DateTime.TryParse(element.GetString(), out var dt) => dt,
        JsonValueKind.String => element.GetString() ?? (object)DBNull.Value,
        _ => element.GetRawText()
    };
}
