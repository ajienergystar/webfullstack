namespace LatihanASP.Application.DTOs;

public class AuditLogListItemDto
{
    public long Id { get; set; }
    public int? UserId { get; set; }
    public string UserFullName { get; set; } = "";
    public string? Username { get; set; }
    public string Action { get; set; } = "";
    public string? TableName { get; set; }
    public long? RecordId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AuditLogListResponseDto
{
    public List<AuditLogListItemDto> Logs { get; set; } = [];
    public int TotalCount { get; set; }
    public int TodayCount { get; set; }
    public int UniqueUserCount { get; set; }
    public List<string> TableNames { get; set; } = [];
}
