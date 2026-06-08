using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IMembershipService
{
    Task<ServiceResult<MembershipListResponseDto>> GetListAsync(
        string? search, string? level, bool? activeOnly);
    Task<ServiceResult<MembershipListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<List<MembershipCustomerOptionDto>>> GetAvailableCustomersAsync();
    Task<ServiceResult<MembershipMutationResponseDto>> CreateAsync(CreateMembershipRequestDto request);
    Task<ServiceResult<MembershipMutationResponseDto>> UpdateAsync(
        int id, UpdateMembershipRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
