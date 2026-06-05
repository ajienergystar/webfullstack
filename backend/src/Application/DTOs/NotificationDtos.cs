namespace LatihanASP.Application.DTOs;

public class NotificationListResponseDto
{
    public List<NotificationItemDto> Items { get; set; } = [];
    public NotificationSummaryDto Summary { get; set; } = new();
}

public class NotificationSummaryDto
{
    public int Total { get; set; }
    public int Warning { get; set; }
    public int Danger { get; set; }
    public int Info { get; set; }
    public int Inventory { get; set; }
    public int Finance { get; set; }
    public int System { get; set; }
}

public class NotificationItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? LinkPath { get; set; }
    public long? ReferenceId { get; set; }
}
