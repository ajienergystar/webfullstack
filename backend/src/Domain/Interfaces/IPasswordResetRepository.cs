namespace LatihanASP.Domain.Interfaces;

public interface IPasswordResetRepository
{
    Task CreateAsync(long userId, string resetToken, DateTime expiredAt);
    Task<long?> GetValidUserIdByTokenAsync(string resetToken);
    Task MarkAsUsedAsync(string resetToken);
}
