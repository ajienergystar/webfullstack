using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IBrandRepository
{
    Task<BrandListResponseDto> GetListAsync(string? search, bool? isActive);
    Task<BrandListItemDto?> GetByIdAsync(int id);
    Task<BrandMutationResponseDto> CreateAsync(CreateBrandRequestDto request);
    Task<BrandMutationResponseDto> UpdateAsync(int id, UpdateBrandRequestDto request);
    Task DeleteAsync(int id);
}
