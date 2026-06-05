using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IProductBundleRepository
{
    Task<ProductBundleFormDataDto> GetFormDataAsync();
    Task<ProductBundleListResponseDto> GetListAsync(string? search, bool? isActive);
    Task<ProductBundleDetailDto?> GetByIdAsync(int id);
    Task<int> CreateAsync(CreateProductBundleRequestDto request);
    Task UpdateAsync(int id, UpdateProductBundleRequestDto request);
    Task DeleteAsync(int id);
}
