using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Constants;

namespace LatihanASP.Application.Validators;

public static class AuthValidators
{
    public static string? ValidateSignUp(SignUpRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return "Nama, email, dan password wajib diisi.";
        }

        if (request.Password.Length < AuthConstants.MinPasswordLength)
        {
            return $"Password minimal {AuthConstants.MinPasswordLength} karakter.";
        }

        return null;
    }

    public static string? ValidateSignIn(SignInRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return "Email dan password wajib diisi.";
        }

        return null;
    }

    public static string? ValidateForgotPassword(ForgotPasswordRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return "Email wajib diisi.";
        }

        return null;
    }

    public static string? ValidateResetPassword(ResetPasswordRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return "Token reset tidak valid.";
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return "Password baru wajib diisi.";
        }

        if (request.NewPassword.Length < AuthConstants.MinPasswordLength)
        {
            return $"Password minimal {AuthConstants.MinPasswordLength} karakter.";
        }

        if (request.NewPassword != request.ConfirmPassword)
        {
            return "Konfirmasi password tidak cocok.";
        }

        return null;
    }
}
