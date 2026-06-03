namespace LatihanASP.Domain.Entities;

public class UserSession
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public string? DeviceInfo { get; set; }
    public string? IpAddress { get; set; }
    public DateTime? ExpiredAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
