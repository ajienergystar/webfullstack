using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IOutletRepository
{
    Task<OutletListResponseDto> GetListAsync(string? search);
    Task<OutletListItemDto?> GetByIdAsync(int id);
    Task<OutletMutationResponseDto> CreateAsync(CreateOutletRequestDto request);
    Task<OutletMutationResponseDto> UpdateAsync(int id, UpdateOutletRequestDto request);
    Task DeleteAsync(int id);
}
