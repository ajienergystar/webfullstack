using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IProductService
{
    Task<ServiceResult<ProductFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<ProductListResponseDto>> GetListAsync(string? search, int? categoryId, bool? isActive);
    Task<ServiceResult<ProductListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<ProductMutationResponseDto>> CreateAsync(CreateProductRequestDto request);
    Task<ServiceResult<ProductMutationResponseDto>> UpdateAsync(int id, UpdateProductRequestDto request);
}
