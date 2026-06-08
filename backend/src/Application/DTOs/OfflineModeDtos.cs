namespace LatihanASP.Application.DTOs;

public class OfflineModeListResponseDto
{
    public List<OfflineDeviceListItemDto> Devices { get; set; } = [];
    public List<OfflineSyncQueueItemDto> Queue { get; set; } = [];
    public List<OfflineSyncLogItemDto> Logs { get; set; } = [];
    public int TotalDevices { get; set; }
    public int EnabledDevices { get; set; }
    public int OnlineDevices { get; set; }
    public int PendingQueueCount { get; set; }
    public int FailedQueueCount { get; set; }
    public int MasterDataCount { get; set; }
}

public class OfflineDeviceListItemDto
{
    public int Id { get; set; }
    public string DeviceCode { get; set; } = "";
    public string DeviceName { get; set; } = "";
    public int OutletId { get; set; }
    public string OutletName { get; set; } = "";
    public string? AssignedUserName { get; set; }
    public bool IsOfflineEnabled { get; set; }
    public bool IsOnline { get; set; }
    public DateTime? LastOnlineAt { get; set; }
    public DateTime? LastSyncAt { get; set; }
    public string? LastSyncStatus { get; set; }
    public DateTime? CachedProductsAt { get; set; }
    public DateTime? CachedCustomersAt { get; set; }
    public DateTime? CachedCategoriesAt { get; set; }
    public int PendingSyncCount { get; set; }
    public string? Notes { get; set; }
}

public class OfflineSyncQueueItemDto
{
    public long Id { get; set; }
    public int DeviceId { get; set; }
    public string DeviceName { get; set; } = "";
    public string QueueNumber { get; set; } = "";
    public string RecordType { get; set; } = "";
    public string? ReferenceLabel { get; set; }
    public decimal? GrandTotal { get; set; }
    public DateTime LocalCreatedAt { get; set; }
    public string SyncStatus { get; set; } = "";
    public DateTime? SyncedAt { get; set; }
    public long? SyncedRecordId { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
}

public class OfflineSyncLogItemDto
{
    public long Id { get; set; }
    public int DeviceId { get; set; }
    public string DeviceName { get; set; } = "";
    public string SyncType { get; set; } = "";
    public string Direction { get; set; } = "";
    public int RecordsProcessed { get; set; }
    public int RecordsFailed { get; set; }
    public string Status { get; set; } = "";
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
}

public class UpdateOfflineDeviceRequestDto
{
    public bool? IsOfflineEnabled { get; set; }
    public string? Notes { get; set; }
}

public class OfflineSyncActionResponseDto
{
    public string Message { get; set; } = "";
    public int RecordsProcessed { get; set; }
    public int RecordsFailed { get; set; }
    public string Status { get; set; } = "";
}
