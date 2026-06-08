using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IDatabaseBackupService
{
    Task<ServiceResult<DatabaseBackupListResponseDto>> GetListAsync(
        string? search, string? backupType, string? status);
    Task<ServiceResult<DatabaseBackupDownloadDto>> GetDownloadInfoAsync(int id);
    Task<ServiceResult<DatabaseBackupMutationResponseDto>> CreateAsync(CreateDatabaseBackupRequestDto request);
    Task<ServiceResult<DatabaseBackupRestoreResponseDto>> RestoreFromFileAsync(Stream fileStream, string fileName);
    Task<ServiceResult<DatabaseBackupRestoreResponseDto>> RestoreFromBackupIdAsync(int id);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
