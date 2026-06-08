using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class SupplierService : ISupplierService
{
    private readonly ISupplierRepository _supplierRepository;

    public SupplierService(ISupplierRepository supplierRepository)
    {
        _supplierRepository = supplierRepository;
    }

    public async Task<ServiceResult<SupplierListResponseDto>> GetListAsync(string? search)
    {
        try
        {
            return ServiceResult<SupplierListResponseDto>.Success(
                await _supplierRepository.GetListAsync(search));
        }
        catch (Exception)
        {
            return ServiceResult<SupplierListResponseDto>.Failure("Gagal memuat daftar supplier.");
        }
    }

    public async Task<ServiceResult<SupplierListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<SupplierListItemDto>.Failure("ID supplier tidak valid.");
        try
        {
            var data = await _supplierRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<SupplierListItemDto>.Failure("Supplier tidak ditemukan.")
                : ServiceResult<SupplierListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<SupplierListItemDto>.Failure("Gagal memuat detail supplier.");
        }
    }

    public async Task<ServiceResult<SupplierMutationResponseDto>> CreateAsync(CreateSupplierRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<SupplierMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<SupplierMutationResponseDto>.Success(
                await _supplierRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<SupplierMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<SupplierMutationResponseDto>.Failure("Gagal menyimpan supplier.");
        }
    }

    public async Task<ServiceResult<SupplierMutationResponseDto>> UpdateAsync(
        int id, UpdateSupplierRequestDto request)
    {
        if (id <= 0) return ServiceResult<SupplierMutationResponseDto>.Failure("ID supplier tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<SupplierMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<SupplierMutationResponseDto>.Success(
                await _supplierRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<SupplierMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<SupplierMutationResponseDto>.Failure("Gagal memperbarui supplier.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID supplier tidak valid.");
        try
        {
            await _supplierRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus supplier.");
        }
    }

    private static string? Validate(CreateSupplierRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.SupplierName))
            return "Nama supplier wajib diisi.";
        if (request.SupplierName.Trim().Length > 100)
            return "Nama supplier maksimal 100 karakter.";
        if (request.Address?.Length > 255)
            return "Alamat maksimal 255 karakter.";
        if (request.PhoneNumber?.Length > 20)
            return "Nomor telepon maksimal 20 karakter.";
        if (request.Email?.Length > 100)
            return "Email maksimal 100 karakter.";
        return null;
    }
}
