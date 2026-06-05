using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IProductDiscountService
{
    Task<ServiceResult<ProductDiscountFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<ProductDiscountListResponseDto>> GetListAsync(string? search, string? discountType, bool? isActive);
    Task<ServiceResult<ProductDiscountDetailDto>> GetByIdAsync(int id);
    Task<ServiceResult<ProductDiscountMutationResponseDto>> CreateAsync(CreateProductDiscountRequestDto request);
    Task<ServiceResult<ProductDiscountMutationResponseDto>> UpdateAsync(int id, UpdateProductDiscountRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
