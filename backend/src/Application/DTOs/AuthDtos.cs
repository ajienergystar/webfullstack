namespace LatihanASP.Application.DTOs;

public record SignUpRequestDto(string FullName, string Email, string Password, string? Phone);
public record SignInRequestDto(string Email, string Password);
public record ForgotPasswordRequestDto(string Email);
public record ResetPasswordRequestDto(string Token, string NewPassword, string ConfirmPassword);

public record AuthResponseDto(
    string AccessToken,
    long UserId,
    string FullName,
    string Email,
    string? Phone,
    bool IsVerified
);

public record UserProfileDto(
    long Id,
    string FullName,
    string Email,
    string? Phone,
    bool IsVerified,
    bool IsActive,
    DateTime? LastLogin,
    DateTime CreatedAt
);

public record MessageResponseDto(string Message);
public record ErrorResponseDto(string Error);
