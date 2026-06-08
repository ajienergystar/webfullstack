using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class OfflineModeService : IOfflineModeService
{
    private static readonly HashSet<string> ValidSyncTypes =
        ["FullDownload", "UploadQueue", "AutoSync"];

    private static readonly HashSet<string> ValidSyncStatuses =
        ["Success", "Failed", "Pending", "Never"];

    private static readonly HashSet<string> ValidQueueStatuses =
        ["Pending", "Syncing", "Synced", "Failed"];

    private readonly IOfflineModeRepository _repository;

    public OfflineModeService(IOfflineModeRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<OfflineModeListResponseDto>> GetListAsync(
        string? search, int? outletId, string? syncStatus, string? queueStatus, int? deviceId)
    {
        if (syncStatus is not null && !ValidSyncStatuses.Contains(syncStatus))
            return ServiceResult<OfflineModeListResponseDto>.Failure("Status sinkronisasi tidak valid.");
        if (queueStatus is not null && !ValidQueueStatuses.Contains(queueStatus))
            return ServiceResult<OfflineModeListResponseDto>.Failure("Status antrian tidak valid.");

        try
        {
            return ServiceResult<OfflineModeListResponseDto>.Success(
                await _repository.GetListAsync(search, outletId, syncStatus, queueStatus, deviceId));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<OfflineModeListResponseDto>.Failure(
                "Tabel OfflineDevices belum ada. Jalankan database/pos/offline-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<OfflineModeListResponseDto>.Failure("Gagal memuat data offline mode.");
        }
    }

    public async Task<ServiceResult<OfflineDeviceListItemDto>> GetDeviceByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<OfflineDeviceListItemDto>.Failure("ID perangkat tidak valid.");
        try
        {
            var data = await _repository.GetDeviceByIdAsync(id);
            return data is null
                ? ServiceResult<OfflineDeviceListItemDto>.Failure("Perangkat tidak ditemukan.")
                : ServiceResult<OfflineDeviceListItemDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<OfflineDeviceListItemDto>.Failure(
                "Tabel OfflineDevices belum ada. Jalankan database/pos/offline-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<OfflineDeviceListItemDto>.Failure("Gagal memuat detail perangkat.");
        }
    }

    public async Task<ServiceResult<MessageResponseDto>> UpdateDeviceAsync(int id, UpdateOfflineDeviceRequestDto request)
    {
        if (id <= 0) return ServiceResult<MessageResponseDto>.Failure("ID perangkat tidak valid.");
        try
        {
            var updated = await _repository.UpdateDeviceAsync(id, request.IsOfflineEnabled, request.Notes);
            return updated
                ? ServiceResult<MessageResponseDto>.Success(new MessageResponseDto("Pengaturan perangkat diperbarui."))
                : ServiceResult<MessageResponseDto>.Failure("Perangkat tidak ditemukan.");
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<MessageResponseDto>.Failure(
                "Tabel OfflineDevices belum ada. Jalankan database/pos/offline-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<MessageResponseDto>.Failure("Gagal memperbarui perangkat.");
        }
    }

    public async Task<ServiceResult<MessageResponseDto>> RetryQueueItemAsync(long queueId)
    {
        if (queueId <= 0) return ServiceResult<MessageResponseDto>.Failure("ID antrian tidak valid.");
        try
        {
            var retried = await _repository.RetryQueueItemAsync(queueId);
            return retried
                ? ServiceResult<MessageResponseDto>.Success(new MessageResponseDto("Antrian dikembalikan ke status menunggu."))
                : ServiceResult<MessageResponseDto>.Failure("Antrian tidak ditemukan atau bukan status gagal.");
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<MessageResponseDto>.Failure(
                "Tabel OfflineSyncQueue belum ada. Jalankan database/pos/offline-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<MessageResponseDto>.Failure("Gagal mencoba ulang antrian.");
        }
    }

    public async Task<ServiceResult<OfflineSyncActionResponseDto>> SyncDeviceAsync(int deviceId, string syncType)
    {
        if (deviceId <= 0) return ServiceResult<OfflineSyncActionResponseDto>.Failure("ID perangkat tidak valid.");
        if (!ValidSyncTypes.Contains(syncType))
            return ServiceResult<OfflineSyncActionResponseDto>.Failure("Tipe sinkronisasi tidak valid.");

        try
        {
            return ServiceResult<OfflineSyncActionResponseDto>.Success(
                await _repository.SyncDeviceAsync(deviceId, syncType));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<OfflineSyncActionResponseDto>.Failure(
                "Tabel OfflineDevices belum ada. Jalankan database/pos/offline-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<OfflineSyncActionResponseDto>.Failure("Gagal menjalankan sinkronisasi.");
        }
    }
}
