using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Application.Settings;
using LatihanASP.Domain.Common;
using LatihanASP.Domain.Interfaces;
using Microsoft.Extensions.Options;

namespace LatihanASP.Application.Services;

public class DatabaseBackupService : IDatabaseBackupService
{
    private static readonly HashSet<string> ValidBackupTypes = ["Manual", "Scheduled", "Auto"];

    private readonly IDatabaseBackupRepository _backupRepository;
    private readonly IPosDatabaseBackupEngine _backupEngine;
    private readonly string _storagePath;

    public DatabaseBackupService(
        IDatabaseBackupRepository backupRepository,
        IPosDatabaseBackupEngine backupEngine,
        IOptions<AppSettings> appSettings)
    {
        _backupRepository = backupRepository;
        _backupEngine = backupEngine;
        _storagePath = string.IsNullOrWhiteSpace(appSettings.Value.BackupStoragePath)
            ? Path.Combine(Directory.GetCurrentDirectory(), "backups")
            : appSettings.Value.BackupStoragePath;
    }

    public async Task<ServiceResult<DatabaseBackupListResponseDto>> GetListAsync(
        string? search, string? backupType, string? status)
    {
        try
        {
            return ServiceResult<DatabaseBackupListResponseDto>.Success(
                await _backupRepository.GetListAsync(search, backupType, status));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<DatabaseBackupListResponseDto>.Failure(
                "Tabel DatabaseBackups belum ada. Jalankan database/pos/backup-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<DatabaseBackupListResponseDto>.Failure("Gagal memuat riwayat backup.");
        }
    }

    public async Task<ServiceResult<DatabaseBackupDownloadDto>> GetDownloadInfoAsync(int id)
    {
        if (id <= 0) return ServiceResult<DatabaseBackupDownloadDto>.Failure("ID backup tidak valid.");
        try
        {
            var info = await _backupRepository.GetDownloadInfoAsync(id);
            if (info is null)
                return ServiceResult<DatabaseBackupDownloadDto>.Failure("Backup tidak ditemukan.");

            if (!File.Exists(info.FilePath))
                return ServiceResult<DatabaseBackupDownloadDto>.Failure("File backup tidak ditemukan di server.");

            return ServiceResult<DatabaseBackupDownloadDto>.Success(info);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<DatabaseBackupDownloadDto>.Failure(
                "Tabel DatabaseBackups belum ada. Jalankan database/pos/backup-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<DatabaseBackupDownloadDto>.Failure("Gagal memuat file backup.");
        }
    }

    public async Task<ServiceResult<DatabaseBackupMutationResponseDto>> CreateAsync(
        CreateDatabaseBackupRequestDto request)
    {
        var backupType = string.IsNullOrWhiteSpace(request.BackupType)
            ? "Manual"
            : request.BackupType.Trim();

        if (!ValidBackupTypes.Contains(backupType))
            return ServiceResult<DatabaseBackupMutationResponseDto>.Failure(
                "Tipe backup harus Manual, Scheduled, atau Auto.");

        try
        {
            Directory.CreateDirectory(_storagePath);

            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            var fileName = $"pos_backup_{timestamp}.json";
            var filePath = Path.Combine(_storagePath, fileName);

            await _backupEngine.ExportToFileAsync(filePath);

            var fileInfo = new FileInfo(filePath);
            var result = await _backupRepository.CreateRecordAsync(
                fileName,
                filePath,
                fileInfo.Length,
                backupType,
                "Completed",
                request.Notes,
                null);

            return ServiceResult<DatabaseBackupMutationResponseDto>.Success(result);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<DatabaseBackupMutationResponseDto>.Failure(
                "Tabel DatabaseBackups belum ada. Jalankan database/pos/backup-tables.sql.");
        }
        catch (Exception ex)
        {
            return ServiceResult<DatabaseBackupMutationResponseDto>.Failure(
                $"Gagal membuat backup: {ex.Message}");
        }
    }

    public async Task<ServiceResult<DatabaseBackupRestoreResponseDto>> RestoreFromBackupIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<DatabaseBackupRestoreResponseDto>.Failure("ID backup tidak valid.");

        var download = await GetDownloadInfoAsync(id);
        if (!download.IsSuccess || download.Data is null)
            return ServiceResult<DatabaseBackupRestoreResponseDto>.Failure(download.Error!);

        var (success, tablesRestored, message) =
            await _backupEngine.RestoreFromFileAsync(download.Data.FilePath);

        if (!success)
            return ServiceResult<DatabaseBackupRestoreResponseDto>.Failure(message);

        await _backupRepository.UpdateStatusAsync(id, "Restored");

        return ServiceResult<DatabaseBackupRestoreResponseDto>.Success(
            new DatabaseBackupRestoreResponseDto
            {
                Success = true,
                TablesRestored = tablesRestored,
                Message = message
            });
    }

    public async Task<ServiceResult<DatabaseBackupRestoreResponseDto>> RestoreFromFileAsync(
        Stream fileStream, string fileName)
    {
        if (fileStream is null || fileStream.Length == 0)
            return ServiceResult<DatabaseBackupRestoreResponseDto>.Failure("File backup kosong.");

        if (!fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            return ServiceResult<DatabaseBackupRestoreResponseDto>.Failure(
                "Format file harus .json (backup POS LatihanASP).");

        try
        {
            var (success, tablesRestored, message) =
                await _backupEngine.RestoreFromStreamAsync(fileStream);

            if (!success)
                return ServiceResult<DatabaseBackupRestoreResponseDto>.Failure(message);

            return ServiceResult<DatabaseBackupRestoreResponseDto>.Success(
                new DatabaseBackupRestoreResponseDto
                {
                    Success = true,
                    TablesRestored = tablesRestored,
                    Message = message
                });
        }
        catch (Exception ex)
        {
            return ServiceResult<DatabaseBackupRestoreResponseDto>.Failure(
                $"Gagal restore database: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID backup tidak valid.");
        try
        {
            var info = await _backupRepository.GetDownloadInfoAsync(id);
            if (info is null)
                return ServiceResult<bool>.Failure("Backup tidak ditemukan.");

            if (File.Exists(info.FilePath))
                File.Delete(info.FilePath);

            await _backupRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus backup.");
        }
    }
}
