namespace LatihanASP.Domain.Interfaces;

public interface IEmailSender
{
    Task SendPasswordResetAsync(string toEmail, string fullName, string resetLink);
}
