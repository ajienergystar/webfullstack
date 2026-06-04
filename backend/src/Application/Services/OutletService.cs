using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class OutletService : IOutletService
{
    private readonly IOutletRepository _outletRepository;

    public OutletService(IOutletRepository outletRepository)
    {
        _outletRepository = outletRepository;
    }

    public async Task<ServiceResult<OutletListResponseDto>> GetListAsync(string? search)
    {
        try
        {
            return ServiceResult<OutletListResponseDto>.Success(
                await _outletRepository.GetListAsync(search));
        }
        catch (Exception)
        {
            return ServiceResult<OutletListResponseDto>.Failure("Gagal memuat daftar cabang.");
        }
    }

    public async Task<ServiceResult<OutletListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<OutletListItemDto>.Failure("ID cabang tidak valid.");
        try
        {
            var data = await _outletRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<OutletListItemDto>.Failure("Cabang tidak ditemukan.")
                : ServiceResult<OutletListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<OutletListItemDto>.Failure("Gagal memuat detail cabang.");
        }
    }

    public async Task<ServiceResult<OutletMutationResponseDto>> CreateAsync(CreateOutletRequestDto request)
    {
        var err = Validate(request.OutletName, request.Address, request.PhoneNumber);
        if (err is not null) return ServiceResult<OutletMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<OutletMutationResponseDto>.Success(
                await _outletRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<OutletMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<OutletMutationResponseDto>.Failure("Gagal menyimpan cabang.");
        }
    }

    public async Task<ServiceResult<OutletMutationResponseDto>> UpdateAsync(
        int id, UpdateOutletRequestDto request)
    {
        if (id <= 0) return ServiceResult<OutletMutationResponseDto>.Failure("ID cabang tidak valid.");
        var err = Validate(request.OutletName, request.Address, request.PhoneNumber);
        if (err is not null) return ServiceResult<OutletMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<OutletMutationResponseDto>.Success(
                await _outletRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<OutletMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<OutletMutationResponseDto>.Failure("Gagal memperbarui cabang.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID cabang tidak valid.");
        try
        {
            await _outletRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus cabang.");
        }
    }

    private static string? Validate(string outletName, string? address, string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(outletName))
            return "Nama cabang wajib diisi.";
        if (outletName.Trim().Length > 100)
            return "Nama cabang maksimal 100 karakter.";
        if (!string.IsNullOrWhiteSpace(address) && address.Trim().Length > 255)
            return "Alamat maksimal 255 karakter.";
        if (!string.IsNullOrWhiteSpace(phoneNumber) && phoneNumber.Trim().Length > 20)
            return "Nomor telepon maksimal 20 karakter.";
        return null;
    }
}
