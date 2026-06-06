namespace LatihanASP.Application.DTOs;

public class DatabaseBackupListResponseDto
{
    public List<DatabaseBackupListItemDto> Backups { get; set; } = [];
    public int TotalCount { get; set; }
    public long TotalSizeBytes { get; set; }
    public DateTime? LastBackupAt { get; set; }
}

public class DatabaseBackupListItemDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = "";
    public long FileSizeBytes { get; set; }
    public string BackupType { get; set; } = "";
    public string Status { get; set; } = "";
    public string? Notes { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateDatabaseBackupRequestDto
{
    public string BackupType { get; set; } = "Manual";
    public string? Notes { get; set; }
}

public class DatabaseBackupMutationResponseDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = "";
    public long FileSizeBytes { get; set; }
    public string Status { get; set; } = "";
}

public class DatabaseBackupDownloadDto
{
    public string FileName { get; set; } = "";
    public string FilePath { get; set; } = "";
    public long FileSizeBytes { get; set; }
}

public class DatabaseBackupRestoreResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public int TablesRestored { get; set; }
}
