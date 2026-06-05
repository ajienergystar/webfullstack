using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IMembershipLevelService
{
    Task<ServiceResult<MembershipLevelListResponseDto>> GetListAsync(string? search, bool? isActive);
    Task<ServiceResult<MembershipLevelListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<MembershipLevelMutationResponseDto>> CreateAsync(CreateMembershipLevelRequestDto request);
    Task<ServiceResult<MembershipLevelMutationResponseDto>> UpdateAsync(
        int id, UpdateMembershipLevelRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
