using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IBrandService
{
    Task<ServiceResult<BrandListResponseDto>> GetListAsync(string? search, bool? isActive);
    Task<ServiceResult<BrandListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<BrandMutationResponseDto>> CreateAsync(CreateBrandRequestDto request);
    Task<ServiceResult<BrandMutationResponseDto>> UpdateAsync(int id, UpdateBrandRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
