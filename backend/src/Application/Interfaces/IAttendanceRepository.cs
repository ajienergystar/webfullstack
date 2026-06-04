using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IAttendanceRepository
{
    Task<AttendanceFormDataDto> GetFormDataAsync();
    Task<AttendanceListResponseDto> GetAllAsync();
    Task<AttendanceDetailDto?> GetByIdAsync(long id);
    Task<bool> UserExistsAsync(int userId);
    Task<bool> OutletExistsAsync(int outletId);
    Task<long> CreateAsync(CreateAttendanceRequestDto request);
    Task UpdateAsync(long id, UpdateAttendanceRequestDto request);
}
