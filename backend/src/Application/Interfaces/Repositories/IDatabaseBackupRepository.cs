using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IDatabaseBackupRepository
{
    Task<DatabaseBackupListResponseDto> GetListAsync(string? search, string? backupType, string? status);
    Task<DatabaseBackupListItemDto?> GetByIdAsync(int id);
    Task<DatabaseBackupDownloadDto?> GetDownloadInfoAsync(int id);
    Task<DatabaseBackupMutationResponseDto> CreateRecordAsync(
        string fileName, string filePath, long fileSizeBytes,
        string backupType, string status, string? notes, int? createdByUserId);
    Task UpdateStatusAsync(int id, string status);
    Task DeleteAsync(int id);
}
