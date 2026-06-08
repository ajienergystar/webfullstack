using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class BrandService : IBrandService
{
    private readonly IBrandRepository _brandRepository;

    public BrandService(IBrandRepository brandRepository)
    {
        _brandRepository = brandRepository;
    }

    public async Task<ServiceResult<BrandListResponseDto>> GetListAsync(string? search, bool? isActive)
    {
        try
        {
            return ServiceResult<BrandListResponseDto>.Success(
                await _brandRepository.GetListAsync(search, isActive));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<BrandListResponseDto>.Failure(
                "Tabel Brands belum ada. Jalankan database/pos/brand-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<BrandListResponseDto>.Failure("Gagal memuat daftar brand.");
        }
    }

    public async Task<ServiceResult<BrandListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<BrandListItemDto>.Failure("ID brand tidak valid.");
        try
        {
            var data = await _brandRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<BrandListItemDto>.Failure("Brand tidak ditemukan.")
                : ServiceResult<BrandListItemDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<BrandListItemDto>.Failure(
                "Tabel Brands belum ada. Jalankan database/pos/brand-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<BrandListItemDto>.Failure("Gagal memuat detail brand.");
        }
    }

    public async Task<ServiceResult<BrandMutationResponseDto>> CreateAsync(CreateBrandRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<BrandMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<BrandMutationResponseDto>.Success(
                await _brandRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<BrandMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<BrandMutationResponseDto>.Failure(
                "Tabel Brands belum ada. Jalankan database/pos/brand-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<BrandMutationResponseDto>.Failure("Gagal menyimpan brand.");
        }
    }

    public async Task<ServiceResult<BrandMutationResponseDto>> UpdateAsync(
        int id, UpdateBrandRequestDto request)
    {
        if (id <= 0) return ServiceResult<BrandMutationResponseDto>.Failure("ID brand tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<BrandMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<BrandMutationResponseDto>.Success(
                await _brandRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<BrandMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<BrandMutationResponseDto>.Failure("Gagal memperbarui brand.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID brand tidak valid.");
        try
        {
            await _brandRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus brand.");
        }
    }

    private static string? Validate(CreateBrandRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.BrandName))
            return "Nama brand wajib diisi.";
        if (request.BrandName.Trim().Length > 100)
            return "Nama brand maksimal 100 karakter.";
        if (request.Description?.Length > 255)
            return "Deskripsi maksimal 255 karakter.";
        return null;
    }
}
