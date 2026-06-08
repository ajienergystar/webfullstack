using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface ICategoryService
{
    Task<ServiceResult<CategoryListResponseDto>> GetListAsync(string? search);
    Task<ServiceResult<CategoryListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<CategoryMutationResponseDto>> CreateAsync(CreateCategoryRequestDto request);
    Task<ServiceResult<CategoryMutationResponseDto>> UpdateAsync(int id, UpdateCategoryRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
