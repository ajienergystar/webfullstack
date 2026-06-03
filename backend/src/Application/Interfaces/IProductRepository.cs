using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IProductRepository
{
    Task<ProductFormDataDto> GetFormDataAsync();
    Task<ProductListResponseDto> GetListAsync(string? search, int? categoryId, bool? isActive);
    Task<ProductListItemDto?> GetByIdAsync(int id);
    Task<ProductMutationResponseDto> CreateAsync(CreateProductRequestDto request);
    Task<ProductMutationResponseDto> UpdateAsync(int id, UpdateProductRequestDto request);
}
