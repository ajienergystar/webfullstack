using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IAuthService
{
    Task<ServiceResult<AuthResponseDto>> SignUpAsync(SignUpRequestDto request);
    Task<ServiceResult<AuthResponseDto>> SignInAsync(SignInRequestDto request, string? ipAddress);
    Task<ServiceResult<MessageResponseDto>> ForgotPasswordAsync(ForgotPasswordRequestDto request);
    Task<ServiceResult<MessageResponseDto>> ResetPasswordAsync(ResetPasswordRequestDto request);
    Task<UserProfileDto?> GetUserByTokenAsync(string accessToken);
    Task<bool> LogoutAsync(string accessToken);
}
