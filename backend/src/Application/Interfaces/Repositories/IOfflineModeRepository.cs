using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IOfflineModeRepository
{
    Task<OfflineModeListResponseDto> GetListAsync(
        string? search, int? outletId, string? syncStatus, string? queueStatus, int? deviceId);
    Task<OfflineDeviceListItemDto?> GetDeviceByIdAsync(int id);
    Task<bool> UpdateDeviceAsync(int id, bool? isOfflineEnabled, string? notes);
    Task<bool> RetryQueueItemAsync(long queueId);
    Task<OfflineSyncActionResponseDto> SyncDeviceAsync(int deviceId, string syncType);
    Task<int> GetMasterDataCountAsync();
}
