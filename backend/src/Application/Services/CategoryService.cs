using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;

    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<ServiceResult<CategoryListResponseDto>> GetListAsync(string? search)
    {
        try
        {
            return ServiceResult<CategoryListResponseDto>.Success(
                await _categoryRepository.GetListAsync(search));
        }
        catch (Exception)
        {
            return ServiceResult<CategoryListResponseDto>.Failure("Gagal memuat daftar kategori.");
        }
    }

    public async Task<ServiceResult<CategoryListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<CategoryListItemDto>.Failure("ID kategori tidak valid.");
        try
        {
            var data = await _categoryRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<CategoryListItemDto>.Failure("Kategori tidak ditemukan.")
                : ServiceResult<CategoryListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<CategoryListItemDto>.Failure("Gagal memuat detail kategori.");
        }
    }

    public async Task<ServiceResult<CategoryMutationResponseDto>> CreateAsync(CreateCategoryRequestDto request)
    {
        var err = ValidateName(request.CategoryName);
        if (err is not null) return ServiceResult<CategoryMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<CategoryMutationResponseDto>.Success(
                await _categoryRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<CategoryMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<CategoryMutationResponseDto>.Failure("Gagal menyimpan kategori.");
        }
    }

    public async Task<ServiceResult<CategoryMutationResponseDto>> UpdateAsync(
        int id, UpdateCategoryRequestDto request)
    {
        if (id <= 0) return ServiceResult<CategoryMutationResponseDto>.Failure("ID kategori tidak valid.");
        var err = ValidateName(request.CategoryName);
        if (err is not null) return ServiceResult<CategoryMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<CategoryMutationResponseDto>.Success(
                await _categoryRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<CategoryMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<CategoryMutationResponseDto>.Failure("Gagal memperbarui kategori.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID kategori tidak valid.");
        try
        {
            await _categoryRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus kategori.");
        }
    }

    private static string? ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return "Nama kategori wajib diisi.";
        if (name.Trim().Length > 100)
            return "Nama kategori maksimal 100 karakter.";
        return null;
    }
}
