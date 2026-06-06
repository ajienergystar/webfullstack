using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class DatabaseBackupRepository : IDatabaseBackupRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public DatabaseBackupRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    private const string SelectColumns = @"
        B.Id, B.FileName, B.FileSizeBytes, B.BackupType, B.Status,
        B.Notes, B.CreatedByUserId, U.FullName, B.CreatedAt";

    public async Task<DatabaseBackupListResponseDto> GetListAsync(
        string? search, string? backupType, string? status)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(B.FileName LIKE @search OR B.Notes LIKE @search OR U.FullName LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (!string.IsNullOrWhiteSpace(backupType))
        {
            where.Add("B.BackupType = @backupType");
            cmd.Parameters.AddWithValue("@backupType", backupType.Trim());
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            where.Add("B.Status = @status");
            cmd.Parameters.AddWithValue("@status", status.Trim());
        }

        cmd.CommandText = $@"
            SELECT {SelectColumns}
            FROM DatabaseBackups B
            LEFT JOIN Users U ON U.Id = B.CreatedByUserId
            WHERE {string.Join(" AND ", where)}
            ORDER BY B.CreatedAt DESC";

        var backups = new List<DatabaseBackupListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                backups.Add(MapItem(reader));
            }
        }

        return new DatabaseBackupListResponseDto
        {
            Backups = backups,
            TotalCount = backups.Count,
            TotalSizeBytes = backups.Sum(b => b.FileSizeBytes),
            LastBackupAt = backups.FirstOrDefault()?.CreatedAt
        };
    }

    public async Task<DatabaseBackupListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand($@"
            SELECT {SelectColumns}
            FROM DatabaseBackups B
            LEFT JOIN Users U ON U.Id = B.CreatedByUserId
            WHERE B.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapItem(reader);
    }

    public async Task<DatabaseBackupDownloadDto?> GetDownloadInfoAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT FileName, FilePath, FileSizeBytes
            FROM DatabaseBackups
            WHERE Id = @id AND Status <> 'Failed'", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new DatabaseBackupDownloadDto
        {
            FileName = reader.GetString(0),
            FilePath = reader.GetString(1),
            FileSizeBytes = reader.GetInt64(2)
        };
    }

    public async Task<DatabaseBackupMutationResponseDto> CreateRecordAsync(
        string fileName, string filePath, long fileSizeBytes,
        string backupType, string status, string? notes, int? createdByUserId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO DatabaseBackups (
                FileName, FilePath, FileSizeBytes, BackupType, Status, Notes, CreatedByUserId
            )
            OUTPUT INSERTED.Id
            VALUES (
                @fileName, @filePath, @fileSizeBytes, @backupType, @status, @notes, @createdByUserId
            )", connection);

        cmd.Parameters.AddWithValue("@fileName", fileName);
        cmd.Parameters.AddWithValue("@filePath", filePath);
        cmd.Parameters.AddWithValue("@fileSizeBytes", fileSizeBytes);
        cmd.Parameters.AddWithValue("@backupType", backupType);
        cmd.Parameters.AddWithValue("@status", status);
        cmd.Parameters.AddWithValue("@notes", string.IsNullOrWhiteSpace(notes) ? DBNull.Value : notes.Trim());
        cmd.Parameters.AddWithValue("@createdByUserId",
            createdByUserId.HasValue ? createdByUserId.Value : DBNull.Value);

        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new DatabaseBackupMutationResponseDto
        {
            Id = id,
            FileName = fileName,
            FileSizeBytes = fileSizeBytes,
            Status = status
        };
    }

    public async Task UpdateStatusAsync(int id, string status)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            UPDATE DatabaseBackups SET Status = @status WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@status", status);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand("DELETE FROM DatabaseBackups WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static DatabaseBackupListItemDto MapItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        FileName = reader.GetString(1),
        FileSizeBytes = reader.GetInt64(2),
        BackupType = reader.GetString(3),
        Status = reader.GetString(4),
        Notes = reader.IsDBNull(5) ? null : reader.GetString(5),
        CreatedByUserId = reader.IsDBNull(6) ? null : reader.GetInt32(6),
        CreatedByUserName = reader.IsDBNull(7) ? null : reader.GetString(7),
        CreatedAt = reader.GetDateTime(8)
    };
}
