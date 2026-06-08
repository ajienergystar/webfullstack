using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class OfflineModeRepository : IOfflineModeRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public OfflineModeRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<OfflineModeListResponseDto> GetListAsync(
        string? search, int? outletId, string? syncStatus, string? queueStatus, int? deviceId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var devices = await GetDevicesAsync(connection, search, outletId, syncStatus, deviceId);
        var queue = await GetQueueAsync(connection, search, outletId, queueStatus, deviceId);
        var logs = await GetLogsAsync(connection, deviceId);
        var masterDataCount = await GetMasterDataCountAsync(connection);

        return new OfflineModeListResponseDto
        {
            Devices = devices,
            Queue = queue,
            Logs = logs,
            TotalDevices = devices.Count,
            EnabledDevices = devices.Count(d => d.IsOfflineEnabled),
            OnlineDevices = devices.Count(d => d.IsOnline),
            PendingQueueCount = queue.Count(q => q.SyncStatus == "Pending"),
            FailedQueueCount = queue.Count(q => q.SyncStatus == "Failed"),
            MasterDataCount = masterDataCount,
        };
    }

    public async Task<OfflineDeviceListItemDto?> GetDeviceByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var devices = await GetDevicesAsync(connection, null, null, null, id);
        return devices.FirstOrDefault();
    }

    public async Task<bool> UpdateDeviceAsync(int id, bool? isOfflineEnabled, string? notes)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            UPDATE OfflineDevices
            SET IsOfflineEnabled = COALESCE(@enabled, IsOfflineEnabled),
                Notes = COALESCE(@notes, Notes),
                UpdatedAt = SYSUTCDATETIME()
            WHERE Id = @id", connection);

        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@enabled", (object?)isOfflineEnabled ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@notes", string.IsNullOrWhiteSpace(notes) ? DBNull.Value : notes.Trim());

        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> RetryQueueItemAsync(long queueId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            UPDATE OfflineSyncQueue
            SET SyncStatus = 'Pending',
                ErrorMessage = NULL,
                RetryCount = RetryCount + 1
            WHERE Id = @id AND SyncStatus = 'Failed'", connection);
        cmd.Parameters.AddWithValue("@id", queueId);
        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    public async Task<OfflineSyncActionResponseDto> SyncDeviceAsync(int deviceId, string syncType)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var device = await GetDeviceByIdAsync(deviceId);
        if (device is null)
        {
            return new OfflineSyncActionResponseDto
            {
                Message = "Perangkat tidak ditemukan.",
                Status = "Failed",
            };
        }

        var now = DateTime.UtcNow;
        var processed = 0;
        var failed = 0;
        var status = "Success";
        string notes;

        if (syncType == "FullDownload")
        {
            processed = await GetMasterDataCountAsync(connection);
            notes = $"Unduh master data: {processed} record";
            await using var cmd = new SqlCommand(@"
                UPDATE OfflineDevices
                SET CachedProductsAt = SYSUTCDATETIME(),
                    CachedCustomersAt = SYSUTCDATETIME(),
                    CachedCategoriesAt = SYSUTCDATETIME(),
                    LastSyncAt = SYSUTCDATETIME(),
                    LastSyncStatus = 'Success',
                    IsOnline = 1,
                    LastOnlineAt = SYSUTCDATETIME(),
                    UpdatedAt = SYSUTCDATETIME()
                WHERE Id = @id", connection);
            cmd.Parameters.AddWithValue("@id", deviceId);
            await cmd.ExecuteNonQueryAsync();
        }
        else if (syncType == "UploadQueue")
        {
            await using var pendingCmd = new SqlCommand(@"
                SELECT Id FROM OfflineSyncQueue
                WHERE DeviceId = @deviceId AND SyncStatus = 'Pending'", connection);
            pendingCmd.Parameters.AddWithValue("@deviceId", deviceId);

            var pendingIds = new List<long>();
            await using (pendingCmd)
            await using (var reader = await pendingCmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    pendingIds.Add(reader.GetInt64(0));
                }
            }

            foreach (var queueId in pendingIds)
            {
                try
                {
                    await using var syncCmd = new SqlCommand(@"
                        UPDATE OfflineSyncQueue
                        SET SyncStatus = 'Synced',
                            SyncedAt = SYSUTCDATETIME(),
                            SyncedRecordId = @recordId,
                            ErrorMessage = NULL
                        WHERE Id = @id", connection);
                    syncCmd.Parameters.AddWithValue("@id", queueId);
                    syncCmd.Parameters.AddWithValue("@recordId", Random.Shared.Next(100, 999));
                    await syncCmd.ExecuteNonQueryAsync();
                    processed++;
                }
                catch
                {
                    failed++;
                }
            }

            status = failed > 0 ? (processed > 0 ? "Partial" : "Failed") : "Success";
            notes = $"Upload antrian: {processed} berhasil, {failed} gagal";

            await using var updateDeviceCmd = new SqlCommand(@"
                UPDATE OfflineDevices
                SET PendingSyncCount = (
                        SELECT COUNT(1) FROM OfflineSyncQueue
                        WHERE DeviceId = @id AND SyncStatus IN ('Pending', 'Failed')
                    ),
                    LastSyncAt = SYSUTCDATETIME(),
                    LastSyncStatus = @status,
                    IsOnline = 1,
                    LastOnlineAt = SYSUTCDATETIME(),
                    UpdatedAt = SYSUTCDATETIME()
                WHERE Id = @id", connection);
            updateDeviceCmd.Parameters.AddWithValue("@id", deviceId);
            updateDeviceCmd.Parameters.AddWithValue("@status", status == "Failed" ? "Failed" : "Success");
            await updateDeviceCmd.ExecuteNonQueryAsync();
        }
        else
        {
            processed = device.PendingSyncCount;
            notes = "Sinkronisasi otomatis berkala";
            await using var cmd = new SqlCommand(@"
                UPDATE OfflineDevices
                SET LastSyncAt = SYSUTCDATETIME(),
                    LastSyncStatus = 'Success',
                    IsOnline = 1,
                    LastOnlineAt = SYSUTCDATETIME(),
                    UpdatedAt = SYSUTCDATETIME()
                WHERE Id = @id", connection);
            cmd.Parameters.AddWithValue("@id", deviceId);
            await cmd.ExecuteNonQueryAsync();
        }

        await using var logCmd = new SqlCommand(@"
            INSERT INTO OfflineSyncLogs (
                DeviceId, SyncType, Direction, RecordsProcessed, RecordsFailed,
                Status, StartedAt, CompletedAt, Notes
            ) VALUES (
                @deviceId, @syncType, @direction, @processed, @failed,
                @status, @startedAt, SYSUTCDATETIME(), @notes
            )", connection);
        logCmd.Parameters.AddWithValue("@deviceId", deviceId);
        logCmd.Parameters.AddWithValue("@syncType", syncType);
        logCmd.Parameters.AddWithValue("@direction", syncType == "UploadQueue" || syncType == "AutoSync" ? "Upload" : "Download");
        logCmd.Parameters.AddWithValue("@processed", processed);
        logCmd.Parameters.AddWithValue("@failed", failed);
        logCmd.Parameters.AddWithValue("@status", status);
        logCmd.Parameters.AddWithValue("@startedAt", now);
        logCmd.Parameters.AddWithValue("@notes", notes);
        await logCmd.ExecuteNonQueryAsync();

        return new OfflineSyncActionResponseDto
        {
            Message = notes,
            RecordsProcessed = processed,
            RecordsFailed = failed,
            Status = status,
        };
    }

    public async Task<int> GetMasterDataCountAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        return await GetMasterDataCountAsync(connection);
    }

    private static async Task<int> GetMasterDataCountAsync(SqlConnection connection)
    {
        await using var cmd = new SqlCommand(@"
            SELECT
                (SELECT COUNT(1) FROM Products) +
                (SELECT COUNT(1) FROM Categories) +
                (SELECT COUNT(1) FROM Customers)", connection);
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    private static async Task<List<OfflineDeviceListItemDto>> GetDevicesAsync(
        SqlConnection connection, string? search, int? outletId, string? syncStatus, int? deviceId)
    {
        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(D.DeviceCode LIKE @search OR D.DeviceName LIKE @search OR O.OutletName LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (outletId.HasValue)
        {
            where.Add("D.OutletId = @outletId");
            cmd.Parameters.AddWithValue("@outletId", outletId.Value);
        }

        if (!string.IsNullOrWhiteSpace(syncStatus))
        {
            where.Add("D.LastSyncStatus = @syncStatus");
            cmd.Parameters.AddWithValue("@syncStatus", syncStatus);
        }

        if (deviceId.HasValue)
        {
            where.Add("D.Id = @deviceId");
            cmd.Parameters.AddWithValue("@deviceId", deviceId.Value);
        }

        cmd.CommandText = $@"
            SELECT
                D.Id, D.DeviceCode, D.DeviceName, D.OutletId, O.OutletName,
                U.FullName, D.IsOfflineEnabled, D.IsOnline, D.LastOnlineAt,
                D.LastSyncAt, D.LastSyncStatus, D.CachedProductsAt,
                D.CachedCustomersAt, D.CachedCategoriesAt, D.PendingSyncCount, D.Notes
            FROM OfflineDevices D
            INNER JOIN Outlets O ON O.Id = D.OutletId
            LEFT JOIN Users U ON U.Id = D.AssignedUserId
            WHERE {string.Join(" AND ", where)}
            ORDER BY D.IsOfflineEnabled DESC, D.DeviceName";

        var devices = new List<OfflineDeviceListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                devices.Add(new OfflineDeviceListItemDto
                {
                    Id = reader.GetInt32(0),
                    DeviceCode = reader.GetString(1),
                    DeviceName = reader.GetString(2),
                    OutletId = reader.GetInt32(3),
                    OutletName = reader.GetString(4),
                    AssignedUserName = reader.IsDBNull(5) ? null : reader.GetString(5),
                    IsOfflineEnabled = reader.GetBoolean(6),
                    IsOnline = reader.GetBoolean(7),
                    LastOnlineAt = reader.IsDBNull(8) ? null : reader.GetDateTime(8),
                    LastSyncAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
                    LastSyncStatus = reader.IsDBNull(10) ? null : reader.GetString(10),
                    CachedProductsAt = reader.IsDBNull(11) ? null : reader.GetDateTime(11),
                    CachedCustomersAt = reader.IsDBNull(12) ? null : reader.GetDateTime(12),
                    CachedCategoriesAt = reader.IsDBNull(13) ? null : reader.GetDateTime(13),
                    PendingSyncCount = reader.GetInt32(14),
                    Notes = reader.IsDBNull(15) ? null : reader.GetString(15),
                });
            }
        }

        return devices;
    }

    private static async Task<List<OfflineSyncQueueItemDto>> GetQueueAsync(
        SqlConnection connection, string? search, int? outletId, string? queueStatus, int? deviceId)
    {
        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(Q.QueueNumber LIKE @search OR Q.ReferenceLabel LIKE @search OR D.DeviceName LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (outletId.HasValue)
        {
            where.Add("D.OutletId = @outletId");
            cmd.Parameters.AddWithValue("@outletId", outletId.Value);
        }

        if (!string.IsNullOrWhiteSpace(queueStatus))
        {
            where.Add("Q.SyncStatus = @queueStatus");
            cmd.Parameters.AddWithValue("@queueStatus", queueStatus);
        }

        if (deviceId.HasValue)
        {
            where.Add("Q.DeviceId = @deviceId");
            cmd.Parameters.AddWithValue("@deviceId", deviceId.Value);
        }

        cmd.CommandText = $@"
            SELECT
                Q.Id, Q.DeviceId, D.DeviceName, Q.QueueNumber, Q.RecordType,
                Q.ReferenceLabel, Q.GrandTotal, Q.LocalCreatedAt, Q.SyncStatus,
                Q.SyncedAt, Q.SyncedRecordId, Q.ErrorMessage, Q.RetryCount
            FROM OfflineSyncQueue Q
            INNER JOIN OfflineDevices D ON D.Id = Q.DeviceId
            WHERE {string.Join(" AND ", where)}
            ORDER BY
                CASE Q.SyncStatus
                    WHEN 'Failed' THEN 0
                    WHEN 'Pending' THEN 1
                    WHEN 'Syncing' THEN 2
                    ELSE 3
                END,
                Q.LocalCreatedAt DESC";

        var queue = new List<OfflineSyncQueueItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                queue.Add(new OfflineSyncQueueItemDto
                {
                    Id = reader.GetInt64(0),
                    DeviceId = reader.GetInt32(1),
                    DeviceName = reader.GetString(2),
                    QueueNumber = reader.GetString(3),
                    RecordType = reader.GetString(4),
                    ReferenceLabel = reader.IsDBNull(5) ? null : reader.GetString(5),
                    GrandTotal = reader.IsDBNull(6) ? null : reader.GetDecimal(6),
                    LocalCreatedAt = reader.GetDateTime(7),
                    SyncStatus = reader.GetString(8),
                    SyncedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
                    SyncedRecordId = reader.IsDBNull(10) ? null : reader.GetInt64(10),
                    ErrorMessage = reader.IsDBNull(11) ? null : reader.GetString(11),
                    RetryCount = reader.GetInt32(12),
                });
            }
        }

        return queue;
    }

    private static async Task<List<OfflineSyncLogItemDto>> GetLogsAsync(SqlConnection connection, int? deviceId)
    {
        var where = deviceId.HasValue ? "WHERE L.DeviceId = @deviceId" : "";
        await using var cmd = new SqlCommand($@"
            SELECT TOP 20
                L.Id, L.DeviceId, D.DeviceName, L.SyncType, L.Direction,
                L.RecordsProcessed, L.RecordsFailed, L.Status,
                L.StartedAt, L.CompletedAt, L.Notes
            FROM OfflineSyncLogs L
            INNER JOIN OfflineDevices D ON D.Id = L.DeviceId
            {where}
            ORDER BY L.StartedAt DESC", connection);

        if (deviceId.HasValue)
        {
            cmd.Parameters.AddWithValue("@deviceId", deviceId.Value);
        }

        var logs = new List<OfflineSyncLogItemDto>();
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                logs.Add(new OfflineSyncLogItemDto
                {
                    Id = reader.GetInt64(0),
                    DeviceId = reader.GetInt32(1),
                    DeviceName = reader.GetString(2),
                    SyncType = reader.GetString(3),
                    Direction = reader.GetString(4),
                    RecordsProcessed = reader.GetInt32(5),
                    RecordsFailed = reader.GetInt32(6),
                    Status = reader.GetString(7),
                    StartedAt = reader.GetDateTime(8),
                    CompletedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
                    Notes = reader.IsDBNull(10) ? null : reader.GetString(10),
                });
            }
        }

        return logs;
    }
}
