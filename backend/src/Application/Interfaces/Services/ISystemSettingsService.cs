using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface ISystemSettingsService
{
    Task<ServiceResult<SystemSettingsDto>> GetAsync();
    Task<ServiceResult<SystemSettingsDto>> UpdateAsync(UpdateSystemSettingsRequestDto request);
}
