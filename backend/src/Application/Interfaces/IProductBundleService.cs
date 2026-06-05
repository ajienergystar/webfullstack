using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IProductBundleService
{
    Task<ServiceResult<ProductBundleFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<ProductBundleListResponseDto>> GetListAsync(string? search, bool? isActive);
    Task<ServiceResult<ProductBundleDetailDto>> GetByIdAsync(int id);
    Task<ServiceResult<ProductBundleMutationResponseDto>> CreateAsync(CreateProductBundleRequestDto request);
    Task<ServiceResult<ProductBundleMutationResponseDto>> UpdateAsync(int id, UpdateProductBundleRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
