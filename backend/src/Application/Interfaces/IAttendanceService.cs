using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IAttendanceService
{
    Task<ServiceResult<AttendanceFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<AttendanceListResponseDto>> GetAllAsync();
    Task<ServiceResult<AttendanceDetailDto>> GetByIdAsync(long id);
    Task<ServiceResult<CreateAttendanceResponseDto>> CreateAsync(CreateAttendanceRequestDto request);
    Task<ServiceResult<MessageResponseDto>> UpdateAsync(long id, UpdateAttendanceRequestDto request);
}
