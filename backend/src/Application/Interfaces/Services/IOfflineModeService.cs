using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IOfflineModeService
{
    Task<ServiceResult<OfflineModeListResponseDto>> GetListAsync(
        string? search, int? outletId, string? syncStatus, string? queueStatus, int? deviceId);
    Task<ServiceResult<OfflineDeviceListItemDto>> GetDeviceByIdAsync(int id);
    Task<ServiceResult<MessageResponseDto>> UpdateDeviceAsync(int id, UpdateOfflineDeviceRequestDto request);
    Task<ServiceResult<MessageResponseDto>> RetryQueueItemAsync(long queueId);
    Task<ServiceResult<OfflineSyncActionResponseDto>> SyncDeviceAsync(int deviceId, string syncType);
}
