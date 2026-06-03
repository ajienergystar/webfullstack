using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;

    public ProductService(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<ServiceResult<ProductFormDataDto>> GetFormDataAsync()
    {
        try
        {
            return ServiceResult<ProductFormDataDto>.Success(await _productRepository.GetFormDataAsync());
        }
        catch (Exception)
        {
            return ServiceResult<ProductFormDataDto>.Failure("Gagal memuat data form produk.");
        }
    }

    public async Task<ServiceResult<ProductListResponseDto>> GetListAsync(
        string? search, int? categoryId, bool? isActive)
    {
        try
        {
            return ServiceResult<ProductListResponseDto>.Success(
                await _productRepository.GetListAsync(search, categoryId, isActive));
        }
        catch (Exception)
        {
            return ServiceResult<ProductListResponseDto>.Failure("Gagal memuat daftar produk.");
        }
    }

    public async Task<ServiceResult<ProductListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<ProductListItemDto>.Failure("ID produk tidak valid.");
        try
        {
            var data = await _productRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<ProductListItemDto>.Failure("Produk tidak ditemukan.")
                : ServiceResult<ProductListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<ProductListItemDto>.Failure("Gagal memuat detail produk.");
        }
    }

    public async Task<ServiceResult<ProductMutationResponseDto>> CreateAsync(CreateProductRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<ProductMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<ProductMutationResponseDto>.Success(
                await _productRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<ProductMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<ProductMutationResponseDto>.Failure("Gagal menyimpan produk.");
        }
    }

    public async Task<ServiceResult<ProductMutationResponseDto>> UpdateAsync(
        int id, UpdateProductRequestDto request)
    {
        if (id <= 0) return ServiceResult<ProductMutationResponseDto>.Failure("ID produk tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<ProductMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<ProductMutationResponseDto>.Success(
                await _productRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<ProductMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<ProductMutationResponseDto>.Failure("Gagal memperbarui produk.");
        }
    }

    private static string? Validate(CreateProductRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ProductName))
            return "Nama produk wajib diisi.";
        if (request.PurchasePrice < 0 || request.SellingPrice < 0)
            return "Harga tidak boleh negatif.";
        if (request.Stock < 0)
            return "Stok tidak boleh negatif.";
        if (request.CategoryId is <= 0)
            request.CategoryId = null;
        return null;
    }
}
