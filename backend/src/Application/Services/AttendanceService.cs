using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class AttendanceService : IAttendanceService
{
    private static readonly HashSet<string> ValidStatuses =
        ["Present", "Late", "Absent", "Leave", "HalfDay"];

    private readonly IAttendanceRepository _repository;

    public AttendanceService(IAttendanceRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<AttendanceFormDataDto>> GetFormDataAsync()
    {
        try
        {
            var data = await _repository.GetFormDataAsync();
            return ServiceResult<AttendanceFormDataDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<AttendanceFormDataDto>.Failure(
                "Gagal memuat data form attendance. Pastikan database POS sudah diinisialisasi.");
        }
    }

    public async Task<ServiceResult<AttendanceListResponseDto>> GetAllAsync()
    {
        try
        {
            var data = await _repository.GetAllAsync();
            return ServiceResult<AttendanceListResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<AttendanceListResponseDto>.Failure("Gagal memuat daftar attendance.");
        }
    }

    public async Task<ServiceResult<AttendanceDetailDto>> GetByIdAsync(long id)
    {
        if (id <= 0) return ServiceResult<AttendanceDetailDto>.Failure("ID attendance tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<AttendanceDetailDto>.Failure("Data attendance tidak ditemukan.")
                : ServiceResult<AttendanceDetailDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<AttendanceDetailDto>.Failure("Gagal memuat detail attendance.");
        }
    }

    public async Task<ServiceResult<CreateAttendanceResponseDto>> CreateAsync(CreateAttendanceRequestDto request)
    {
        var err = await ValidateAsync(
            request.UserId, request.OutletId, request.AttendanceDate,
            request.ClockIn, request.ClockOut, request.Status);
        if (err is not null) return ServiceResult<CreateAttendanceResponseDto>.Failure(err);

        try
        {
            var id = await _repository.CreateAsync(request);
            return ServiceResult<CreateAttendanceResponseDto>.Success(new CreateAttendanceResponseDto { Id = id });
        }
        catch (Exception)
        {
            return ServiceResult<CreateAttendanceResponseDto>.Failure("Gagal menyimpan data attendance.");
        }
    }

    public async Task<ServiceResult<MessageResponseDto>> UpdateAsync(long id, UpdateAttendanceRequestDto request)
    {
        if (id <= 0) return ServiceResult<MessageResponseDto>.Failure("ID attendance tidak valid.");

        if (await _repository.GetByIdAsync(id) is null)
            return ServiceResult<MessageResponseDto>.Failure("Data attendance tidak ditemukan.");

        var err = await ValidateAsync(
            request.UserId, request.OutletId, request.AttendanceDate,
            request.ClockIn, request.ClockOut, request.Status);
        if (err is not null) return ServiceResult<MessageResponseDto>.Failure(err);

        try
        {
            await _repository.UpdateAsync(id, request);
            return ServiceResult<MessageResponseDto>.Success(
                new MessageResponseDto("Data attendance berhasil diperbarui."));
        }
        catch (Exception)
        {
            return ServiceResult<MessageResponseDto>.Failure("Gagal memperbarui data attendance.");
        }
    }

    private async Task<string?> ValidateAsync(
        int userId, int? outletId, DateOnly attendanceDate,
        DateTime clockIn, DateTime? clockOut, string status)
    {
        if (userId <= 0)
            return "Karyawan wajib dipilih.";
        if (!await _repository.UserExistsAsync(userId))
            return "Karyawan tidak valid atau tidak aktif.";
        if (outletId.HasValue && outletId > 0 && !await _repository.OutletExistsAsync(outletId.Value))
            return "Outlet tidak valid.";
        if (attendanceDate == default)
            return "Tanggal attendance wajib diisi.";
        if (clockIn == default)
            return "Jam masuk wajib diisi.";
        if (clockOut.HasValue && clockOut.Value < clockIn)
            return "Jam keluar tidak boleh lebih awal dari jam masuk.";
        if (string.IsNullOrWhiteSpace(status) || !ValidStatuses.Contains(status))
            return "Status attendance tidak valid.";

        return null;
    }
}
