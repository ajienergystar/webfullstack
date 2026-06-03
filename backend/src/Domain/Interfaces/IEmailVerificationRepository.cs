namespace LatihanASP.Domain.Interfaces;

public interface IEmailVerificationRepository
{
    Task CreateAsync(long userId, string verificationCode, DateTime expiredAt);
}
