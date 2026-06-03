using LatihanASP.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace LatihanASP.Infrastructure.ExternalServices;

public class SmtpEmailSender : IEmailSender
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailSettings> settings, ILogger<SmtpEmailSender> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SendPasswordResetAsync(string toEmail, string fullName, string resetLink)
    {
        if (!_settings.IsConfigured)
        {
            throw new InvalidOperationException(
                "SMTP belum dikonfigurasi. Isi bagian Email di appsettings.json (Host, UserName, Password).");
        }

        var recipientEmail = toEmail.Trim().ToLowerInvariant();

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.FromName, _settings.UserName));
        message.To.Add(MailboxAddress.Parse(recipientEmail));
        message.Subject = "Reset Password - LatihanASP";

        var body = $"""
            <p>Halo <strong>{fullName}</strong>,</p>
            <p>Kami menerima permintaan reset password untuk akun dengan email <strong>{recipientEmail}</strong>.</p>
            <p>Klik tautan berikut (berlaku 1 jam):</p>
            <p><a href="{resetLink}">{resetLink}</a></p>
            <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
            <br/>
            <p>— {_settings.FromName}</p>
            """;

        message.Body = new TextPart("html") { Text = body };

        using var client = new SmtpClient();
        await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(_settings.UserName, _settings.Password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);

        _logger.LogInformation("Email reset password terkirim ke {Email}", recipientEmail);
    }
}
