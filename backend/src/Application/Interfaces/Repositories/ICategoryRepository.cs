using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface ICategoryRepository
{
    Task<CategoryListResponseDto> GetListAsync(string? search);
    Task<CategoryListItemDto?> GetByIdAsync(int id);
    Task<CategoryMutationResponseDto> CreateAsync(CreateCategoryRequestDto request);
    Task<CategoryMutationResponseDto> UpdateAsync(int id, UpdateCategoryRequestDto request);
    Task DeleteAsync(int id);
}
