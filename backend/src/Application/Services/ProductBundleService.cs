using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class ProductBundleService : IProductBundleService
{
    private readonly IProductBundleRepository _repository;

    public ProductBundleService(IProductBundleRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<ProductBundleFormDataDto>> GetFormDataAsync()
    {
        try
        {
            return ServiceResult<ProductBundleFormDataDto>.Success(await _repository.GetFormDataAsync());
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductBundleFormDataDto>.Failure(
                "Tabel ProductBundles belum ada. Jalankan database/pos/product-bundle-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductBundleFormDataDto>.Failure("Gagal memuat data form bundling.");
        }
    }

    public async Task<ServiceResult<ProductBundleListResponseDto>> GetListAsync(string? search, bool? isActive)
    {
        try
        {
            return ServiceResult<ProductBundleListResponseDto>.Success(
                await _repository.GetListAsync(search, isActive));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductBundleListResponseDto>.Failure(
                "Tabel ProductBundles belum ada. Jalankan database/pos/product-bundle-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductBundleListResponseDto>.Failure("Gagal memuat daftar bundling.");
        }
    }

    public async Task<ServiceResult<ProductBundleDetailDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<ProductBundleDetailDto>.Failure("ID bundling tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<ProductBundleDetailDto>.Failure("Data bundling tidak ditemukan.")
                : ServiceResult<ProductBundleDetailDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductBundleDetailDto>.Failure(
                "Tabel ProductBundles belum ada. Jalankan database/pos/product-bundle-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductBundleDetailDto>.Failure("Gagal memuat detail bundling.");
        }
    }

    public async Task<ServiceResult<ProductBundleMutationResponseDto>> CreateAsync(
        CreateProductBundleRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<ProductBundleMutationResponseDto>.Failure(err);

        try
        {
            var id = await _repository.CreateAsync(request);
            return ServiceResult<ProductBundleMutationResponseDto>.Success(new ProductBundleMutationResponseDto
            {
                Id = id,
                BundleCode = request.BundleCode.Trim().ToUpperInvariant(),
                BundleName = request.BundleName.Trim()
            });
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductBundleMutationResponseDto>.Failure(
                "Tabel ProductBundles belum ada. Jalankan database/pos/product-bundle-tables.sql.");
        }
        catch (Exception ex) when (ex.Message.Contains("UNIQUE") || ex.Message.Contains("duplicate"))
        {
            return ServiceResult<ProductBundleMutationResponseDto>.Failure(
                "Kode bundling sudah digunakan. Gunakan kode lain.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductBundleMutationResponseDto>.Failure("Gagal menyimpan bundling.");
        }
    }

    public async Task<ServiceResult<ProductBundleMutationResponseDto>> UpdateAsync(
        int id, UpdateProductBundleRequestDto request)
    {
        if (id <= 0) return ServiceResult<ProductBundleMutationResponseDto>.Failure("ID bundling tidak valid.");

        var err = Validate(request);
        if (err is not null) return ServiceResult<ProductBundleMutationResponseDto>.Failure(err);

        try
        {
            await _repository.UpdateAsync(id, request);
            return ServiceResult<ProductBundleMutationResponseDto>.Success(new ProductBundleMutationResponseDto
            {
                Id = id,
                BundleCode = request.BundleCode.Trim().ToUpperInvariant(),
                BundleName = request.BundleName.Trim()
            });
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<ProductBundleMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ProductBundleMutationResponseDto>.Failure(
                "Tabel ProductBundles belum ada. Jalankan database/pos/product-bundle-tables.sql.");
        }
        catch (Exception ex) when (ex.Message.Contains("UNIQUE") || ex.Message.Contains("duplicate"))
        {
            return ServiceResult<ProductBundleMutationResponseDto>.Failure(
                "Kode bundling sudah digunakan. Gunakan kode lain.");
        }
        catch (Exception)
        {
            return ServiceResult<ProductBundleMutationResponseDto>.Failure("Gagal memperbarui bundling.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID bundling tidak valid.");
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
            return ServiceResult<bool>.Failure("Gagal menghapus bundling.");
        }
    }

    private static string? Validate(CreateProductBundleRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.BundleCode))
            return "Kode bundling wajib diisi.";
        if (request.BundleCode.Trim().Length > 50)
            return "Kode bundling maksimal 50 karakter.";
        if (string.IsNullOrWhiteSpace(request.BundleName))
            return "Nama bundling wajib diisi.";
        if (request.BundleName.Trim().Length > 100)
            return "Nama bundling maksimal 100 karakter.";
        if (request.BundlePrice <= 0)
            return "Harga paket harus lebih dari 0.";
        if (request.EndDate.HasValue && request.EndDate.Value < request.StartDate)
            return "Tanggal berakhir tidak boleh sebelum tanggal mulai.";
        if (request.Items is null || request.Items.Count == 0)
            return "Minimal satu produk harus ditambahkan.";
        if (request.Items.Any(i => i.ProductId <= 0))
            return "Produk tidak valid.";
        if (request.Items.Any(i => i.Qty <= 0))
            return "Qty produk harus lebih dari 0.";
        return null;
    }
}
