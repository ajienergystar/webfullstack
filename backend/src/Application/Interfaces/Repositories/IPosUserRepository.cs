using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IPosUserRepository
{
    Task<PosUserFormDataDto> GetFormDataAsync();
    Task<PosUserListResponseDto> GetAllAsync();
    Task<PosUserDetailDto?> GetByIdAsync(int id);
    Task<bool> UsernameExistsAsync(string username, int? excludeId = null);
    Task<bool> RoleExistsAsync(int roleId);
    Task<int> CreateAsync(CreatePosUserRequestDto request, string passwordHash);
    Task UpdateAsync(int id, UpdatePosUserRequestDto request, string? passwordHash);
}
