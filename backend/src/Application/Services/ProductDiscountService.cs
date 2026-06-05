using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class ProductDiscountService : IProductDiscountService
{
    private static readonly HashSet<string> AllowedTypes = ["PERCENT", "FIXED"];

    private readonly IProductDiscountRepository _repository;

    public ProductDiscountService(IProductDiscountRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<ProductDiscountFormDataDto>> GetFormDataAsync()
    {
        try
        {
            return ServiceResult<ProductDiscountFormDataDto>.Success(await _repository.GetFormDataAsync());
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductDiscountFormDataDto>.Failure(
                "Tabel ProductDiscounts belum ada. Jalankan database/pos/product-discount-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductDiscountFormDataDto>.Failure("Gagal memuat data form diskon produk.");
        }
    }

    public async Task<ServiceResult<ProductDiscountListResponseDto>> GetListAsync(
        string? search, string? discountType, bool? isActive)
    {
        try
        {
            return ServiceResult<ProductDiscountListResponseDto>.Success(
                await _repository.GetListAsync(search, discountType, isActive));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductDiscountListResponseDto>.Failure(
                "Tabel ProductDiscounts belum ada. Jalankan database/pos/product-discount-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductDiscountListResponseDto>.Failure("Gagal memuat daftar diskon produk.");
        }
    }

    public async Task<ServiceResult<ProductDiscountDetailDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<ProductDiscountDetailDto>.Failure("ID diskon tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<ProductDiscountDetailDto>.Failure("Data diskon produk tidak ditemukan.")
                : ServiceResult<ProductDiscountDetailDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductDiscountDetailDto>.Failure(
                "Tabel ProductDiscounts belum ada. Jalankan database/pos/product-discount-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductDiscountDetailDto>.Failure("Gagal memuat detail diskon produk.");
        }
    }

    public async Task<ServiceResult<ProductDiscountMutationResponseDto>> CreateAsync(
        CreateProductDiscountRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<ProductDiscountMutationResponseDto>.Failure(err);

        try
        {
            var id = await _repository.CreateAsync(request);
            return ServiceResult<ProductDiscountMutationResponseDto>.Success(new ProductDiscountMutationResponseDto
            {
                Id = id,
                DiscountName = request.DiscountName.Trim()
            });
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductDiscountMutationResponseDto>.Failure(
                "Tabel ProductDiscounts belum ada. Jalankan database/pos/product-discount-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductDiscountMutationResponseDto>.Failure("Gagal menyimpan diskon produk.");
        }
    }

    public async Task<ServiceResult<ProductDiscountMutationResponseDto>> UpdateAsync(
        int id, UpdateProductDiscountRequestDto request)
    {
        if (id <= 0) return ServiceResult<ProductDiscountMutationResponseDto>.Failure("ID diskon tidak valid.");

        var err = Validate(request);
        if (err is not null) return ServiceResult<ProductDiscountMutationResponseDto>.Failure(err);

        try
        {
            await _repository.UpdateAsync(id, request);
            return ServiceResult<ProductDiscountMutationResponseDto>.Success(new ProductDiscountMutationResponseDto
            {
                Id = id,
                DiscountName = request.DiscountName.Trim()
            });
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<ProductDiscountMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductDiscountMutationResponseDto>.Failure(
                "Tabel ProductDiscounts belum ada. Jalankan database/pos/product-discount-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductDiscountMutationResponseDto>.Failure("Gagal memperbarui diskon produk.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID diskon tidak valid.");
        try
        {
            await _repository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus diskon produk.");
        }
    }

    private static string? Validate(CreateProductDiscountRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.DiscountName))
            return "Nama diskon wajib diisi.";
        if (request.DiscountName.Trim().Length > 100)
            return "Nama diskon maksimal 100 karakter.";
        if (string.IsNullOrWhiteSpace(request.DiscountType)
            || !AllowedTypes.Contains(request.DiscountType.Trim().ToUpperInvariant()))
            return "Tipe diskon tidak valid.";
        if (request.DiscountValue <= 0)
            return "Nilai diskon harus lebih dari 0.";
        if (request.DiscountType.Equals("PERCENT", StringComparison.OrdinalIgnoreCase)
            && request.DiscountValue > 100)
            return "Diskon persentase maksimal 100%.";
        if (request.MinPurchaseAmount.HasValue && request.MinPurchaseAmount.Value < 0)
            return "Minimum pembelian tidak valid.";
        if (request.EndDate.HasValue && request.EndDate.Value < request.StartDate)
            return "Tanggal berakhir tidak boleh sebelum tanggal mulai.";
        if (request.ProductIds is null || request.ProductIds.Count == 0)
            return "Minimal satu produk harus dipilih.";
        return null;
    }
}
