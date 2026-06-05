using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IMembershipLevelRepository
{
    Task<MembershipLevelListResponseDto> GetListAsync(string? search, bool? isActive);
    Task<MembershipLevelListItemDto?> GetByIdAsync(int id);
    Task<List<string>> GetActiveLevelNamesAsync();
    Task<MembershipLevelMutationResponseDto> CreateAsync(CreateMembershipLevelRequestDto request);
    Task<MembershipLevelMutationResponseDto> UpdateAsync(int id, UpdateMembershipLevelRequestDto request);
    Task DeleteAsync(int id);
}
