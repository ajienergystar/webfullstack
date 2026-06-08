using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IMembershipRepository
{
    Task<MembershipListResponseDto> GetListAsync(string? search, string? level, bool? activeOnly);
    Task<MembershipListItemDto?> GetByIdAsync(int id);
    Task<List<MembershipCustomerOptionDto>> GetAvailableCustomersAsync();
    Task<MembershipMutationResponseDto> CreateAsync(CreateMembershipRequestDto request);
    Task<MembershipMutationResponseDto> UpdateAsync(int id, UpdateMembershipRequestDto request);
    Task DeleteAsync(int id);
}
