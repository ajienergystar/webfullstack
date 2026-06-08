using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class CashierShiftService : ICashierShiftService
{
    private readonly ICashierShiftRepository _repository;

    public CashierShiftService(ICashierShiftRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<CashierShiftFormDataDto>> GetFormDataAsync()
    {
        try
        {
            var data = await _repository.GetFormDataAsync();
            return ServiceResult<CashierShiftFormDataDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<CashierShiftFormDataDto>.Failure(
                "Gagal memuat data form shift. Pastikan database POS sudah diinisialisasi.");
        }
    }

    public async Task<ServiceResult<CashierShiftListResponseDto>> GetAllAsync()
    {
        try
        {
            var data = await _repository.GetAllAsync();
            return ServiceResult<CashierShiftListResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<CashierShiftListResponseDto>.Failure("Gagal memuat daftar shift kasir.");
        }
    }

    public async Task<ServiceResult<CashierShiftDetailDto>> GetByIdAsync(long id)
    {
        if (id <= 0) return ServiceResult<CashierShiftDetailDto>.Failure("ID shift tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<CashierShiftDetailDto>.Failure("Shift kasir tidak ditemukan.")
                : ServiceResult<CashierShiftDetailDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<CashierShiftDetailDto>.Failure("Gagal memuat detail shift kasir.");
        }
    }

    public async Task<ServiceResult<CreateCashierShiftResponseDto>> CreateAsync(CreateCashierShiftRequestDto request)
    {
        var err = await ValidateAsync(request.UserId, request.OpenTime, request.CloseTime, null);
        if (err is not null) return ServiceResult<CreateCashierShiftResponseDto>.Failure(err);

        try
        {
            var id = await _repository.CreateAsync(request);
            return ServiceResult<CreateCashierShiftResponseDto>.Success(new CreateCashierShiftResponseDto { Id = id });
        }
        catch (Exception)
        {
            return ServiceResult<CreateCashierShiftResponseDto>.Failure("Gagal menyimpan shift kasir baru.");
        }
    }

    public async Task<ServiceResult<MessageResponseDto>> UpdateAsync(long id, UpdateCashierShiftRequestDto request)
    {
        if (id <= 0) return ServiceResult<MessageResponseDto>.Failure("ID shift tidak valid.");

        if (await _repository.GetByIdAsync(id) is null)
            return ServiceResult<MessageResponseDto>.Failure("Shift kasir tidak ditemukan.");

        var err = await ValidateAsync(request.UserId, request.OpenTime, request.CloseTime, id);
        if (err is not null) return ServiceResult<MessageResponseDto>.Failure(err);

        try
        {
            await _repository.UpdateAsync(id, request);
            return ServiceResult<MessageResponseDto>.Success(
                new MessageResponseDto("Data shift kasir berhasil diperbarui."));
        }
        catch (Exception)
        {
            return ServiceResult<MessageResponseDto>.Failure("Gagal memperbarui shift kasir.");
        }
    }

    public async Task<ServiceResult<CashierReportResponseDto>> GetReportAsync(CashierReportFilterDto filter)
    {
        try
        {
            var data = await _repository.GetReportAsync(filter);
            return ServiceResult<CashierReportResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<CashierReportResponseDto>.Failure("Gagal memuat laporan kasir.");
        }
    }

    private async Task<string?> ValidateAsync(int userId, DateTime openTime, DateTime? closeTime, long? excludeId)
    {
        if (userId <= 0)
            return "Kasir wajib dipilih.";
        if (!await _repository.UserExistsAsync(userId))
            return "Kasir tidak valid atau tidak aktif.";
        if (openTime == default)
            return "Waktu buka shift wajib diisi.";
        if (closeTime.HasValue && closeTime.Value < openTime)
            return "Waktu tutup tidak boleh lebih awal dari waktu buka.";
        if (!closeTime.HasValue && await _repository.HasOpenShiftAsync(userId, excludeId))
            return "Kasir ini masih memiliki shift yang belum ditutup.";

        return null;
    }
}
