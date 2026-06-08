using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IProductDiscountRepository
{
    Task<ProductDiscountFormDataDto> GetFormDataAsync();
    Task<ProductDiscountListResponseDto> GetListAsync(string? search, string? discountType, bool? isActive);
    Task<ProductDiscountDetailDto?> GetByIdAsync(int id);
    Task<int> CreateAsync(CreateProductDiscountRequestDto request);
    Task UpdateAsync(int id, UpdateProductDiscountRequestDto request);
    Task DeleteAsync(int id);
}
