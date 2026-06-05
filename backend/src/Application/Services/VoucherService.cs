using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class VoucherService : IVoucherService
{
    private readonly IVoucherRepository _voucherRepository;

    public VoucherService(IVoucherRepository voucherRepository)
    {
        _voucherRepository = voucherRepository;
    }

    public async Task<ServiceResult<VoucherListResponseDto>> GetListAsync(string? search, bool? isActive)
    {
        try
        {
            return ServiceResult<VoucherListResponseDto>.Success(
                await _voucherRepository.GetListAsync(search, isActive));
        }
        catch (Exception)
        {
            return ServiceResult<VoucherListResponseDto>.Failure("Gagal memuat daftar voucher.");
        }
    }

    public async Task<ServiceResult<VoucherListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<VoucherListItemDto>.Failure("ID voucher tidak valid.");
        try
        {
            var data = await _voucherRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<VoucherListItemDto>.Failure("Voucher tidak ditemukan.")
                : ServiceResult<VoucherListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<VoucherListItemDto>.Failure("Gagal memuat detail voucher.");
        }
    }

    public async Task<ServiceResult<VoucherMutationResponseDto>> CreateAsync(CreateVoucherRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<VoucherMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<VoucherMutationResponseDto>.Success(
                await _voucherRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<VoucherMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<VoucherMutationResponseDto>.Failure("Gagal menyimpan voucher.");
        }
    }

    public async Task<ServiceResult<VoucherMutationResponseDto>> UpdateAsync(
        int id, UpdateVoucherRequestDto request)
    {
        if (id <= 0) return ServiceResult<VoucherMutationResponseDto>.Failure("ID voucher tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<VoucherMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<VoucherMutationResponseDto>.Success(
                await _voucherRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<VoucherMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<VoucherMutationResponseDto>.Failure("Gagal memperbarui voucher.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID voucher tidak valid.");
        try
        {
            await _voucherRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus voucher.");
        }
    }

    private static string? Validate(CreateVoucherRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.VoucherCode))
            return "Kode voucher wajib diisi.";
        if (request.VoucherCode.Trim().Length > 50)
            return "Kode voucher maksimal 50 karakter.";
        if (request.DiscountAmount is null or <= 0)
            return "Nominal diskon harus lebih dari 0.";
        return null;
    }
}
