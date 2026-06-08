using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IPosRoleRepository
{
    Task<PosRoleFormDataDto> GetFormDataAsync();
    Task<PosRoleListResponseDto> GetAllAsync();
    Task<PosRoleDetailDto?> GetByIdAsync(int id);
    Task<bool> RoleNameExistsAsync(string roleName, int? excludeId = null);
    Task<bool> AllPermissionsExistAsync(IEnumerable<int> permissionIds);
    Task<int> GetUserCountByRoleIdAsync(int roleId);
    Task<int> CreateAsync(CreatePosRoleRequestDto request);
    Task UpdateAsync(int id, UpdatePosRoleRequestDto request);
    Task DeleteAsync(int id);
}
