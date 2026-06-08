using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Application.Validators;
using LatihanASP.Domain.Constants;
using LatihanASP.Domain.Entities;
using LatihanASP.Domain.Interfaces;
using LatihanASP.Application.Settings;
using LatihanASP.Domain.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LatihanASP.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _sessionRepository;
    private readonly IPasswordResetRepository _passwordResetRepository;
    private readonly IEmailVerificationRepository _emailVerificationRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailSender _emailSender;
    private readonly AppSettings _appSettings;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IUserSessionRepository sessionRepository,
        IPasswordResetRepository passwordResetRepository,
        IEmailVerificationRepository emailVerificationRepository,
        IPasswordHasher passwordHasher,
        IEmailSender emailSender,
        IOptions<AppSettings> appSettings,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _sessionRepository = sessionRepository;
        _passwordResetRepository = passwordResetRepository;
        _emailVerificationRepository = emailVerificationRepository;
        _passwordHasher = passwordHasher;
        _emailSender = emailSender;
        _appSettings = appSettings.Value;
        _logger = logger;
    }

    public async Task<ServiceResult<AuthResponseDto>> SignUpAsync(SignUpRequestDto request)
    {
        var validationError = AuthValidators.ValidateSignUp(request);
        if (validationError is not null)
        {
            return ServiceResult<AuthResponseDto>.Failure(validationError);
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await _userRepository.EmailExistsAsync(email))
        {
            return ServiceResult<AuthResponseDto>.Failure("Email sudah terdaftar.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = request.Phone?.Trim(),
            PasswordHash = _passwordHasher.Hash(request.Password),
            IsVerified = false,
            IsActive = true
        };

        var userId = await _userRepository.CreateAsync(user);

        var verificationCode = Random.Shared.Next(100000, 999999).ToString();
        await _emailVerificationRepository.CreateAsync(
            userId,
            verificationCode,
            DateTime.UtcNow.AddHours(AuthConstants.EmailVerificationExpiryHours));

        return await CreateSessionResponseAsync(userId, user.FullName, user.Email, user.Phone, user.IsVerified);
    }

    public async Task<ServiceResult<AuthResponseDto>> SignInAsync(SignInRequestDto request, string? ipAddress)
    {
        var validationError = AuthValidators.ValidateSignIn(request);
        if (validationError is not null)
        {
            return ServiceResult<AuthResponseDto>.Failure(validationError);
        }

        var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant());
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return ServiceResult<AuthResponseDto>.Failure("Email atau password salah.");
        }

        if (!user.IsActive)
        {
            return ServiceResult<AuthResponseDto>.Failure("Akun tidak aktif. Hubungi administrator.");
        }

        await _userRepository.UpdateLastLoginAsync(user.Id);
        return await CreateSessionResponseAsync(user.Id, user.FullName, user.Email, user.Phone, user.IsVerified, ipAddress);
    }

    public async Task<ServiceResult<MessageResponseDto>> ForgotPasswordAsync(ForgotPasswordRequestDto request)
    {
        var validationError = AuthValidators.ValidateForgotPassword(request);
        if (validationError is not null)
        {
            return ServiceResult<MessageResponseDto>.Failure(validationError);
        }

        var recipientEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _userRepository.GetByEmailAsync(recipientEmail);
        if (user is null || !user.IsActive)
        {
            return ServiceResult<MessageResponseDto>.Success(new MessageResponseDto(
                "Jika email terdaftar, instruksi reset password telah dikirim ke inbox Anda."));
        }

        var resetToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

        await _passwordResetRepository.CreateAsync(
            user.Id,
            resetToken,
            DateTime.UtcNow.AddHours(AuthConstants.PasswordResetExpiryHours));

        var resetLink = $"{_appSettings.FrontendBaseUrl.TrimEnd('/')}/reset-password?token={resetToken}";

        try
        {
            await _emailSender.SendPasswordResetAsync(recipientEmail, user.FullName, resetLink);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gagal mengirim email reset password ke {Email}", recipientEmail);
            return ServiceResult<MessageResponseDto>.Failure(
                "Gagal mengirim email. Periksa konfigurasi SMTP di appsettings.json atau hubungi administrator.");
        }

        return ServiceResult<MessageResponseDto>.Success(new MessageResponseDto(
            $"Instruksi reset password telah dikirim ke {recipientEmail}. Periksa inbox (dan folder spam)."));
    }

    public async Task<ServiceResult<MessageResponseDto>> ResetPasswordAsync(ResetPasswordRequestDto request)
    {
        var validationError = AuthValidators.ValidateResetPassword(request);
        if (validationError is not null)
        {
            return ServiceResult<MessageResponseDto>.Failure(validationError);
        }

        var userId = await _passwordResetRepository.GetValidUserIdByTokenAsync(request.Token.Trim());
        if (userId is null)
        {
            return ServiceResult<MessageResponseDto>.Failure("Token reset tidak valid atau sudah kedaluwarsa.");
        }

        var passwordHash = _passwordHasher.Hash(request.NewPassword);
        await _userRepository.UpdatePasswordHashAsync(userId.Value, passwordHash);
        await _passwordResetRepository.MarkAsUsedAsync(request.Token.Trim());

        return ServiceResult<MessageResponseDto>.Success(new MessageResponseDto(
            "Password berhasil diubah. Silakan login dengan password baru."));
    }

    public async Task<UserProfileDto?> GetUserByTokenAsync(string accessToken)
    {
        var user = await _sessionRepository.GetUserByAccessTokenAsync(accessToken);
        if (user is null) return null;

        return new UserProfileDto(
            user.Id,
            user.FullName,
            user.Email,
            user.Phone,
            user.IsVerified,
            user.IsActive,
            user.LastLogin,
            user.CreatedAt
        );
    }

    public async Task<bool> LogoutAsync(string accessToken)
    {
        return await _sessionRepository.DeleteByAccessTokenAsync(accessToken);
    }

    private async Task<ServiceResult<AuthResponseDto>> CreateSessionResponseAsync(
        long userId,
        string fullName,
        string email,
        string? phone,
        bool isVerified,
        string? ipAddress = null)
    {
        var accessToken = Guid.NewGuid().ToString("N");
        var refreshToken = Guid.NewGuid().ToString("N");

        await _sessionRepository.CreateAsync(new UserSession
        {
            UserId = userId,
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            IpAddress = ipAddress,
            ExpiredAt = DateTime.UtcNow.AddDays(AuthConstants.SessionExpiryDays)
        });

        return ServiceResult<AuthResponseDto>.Success(new AuthResponseDto(
            accessToken, userId, fullName, email, phone, isVerified));
    }
}
