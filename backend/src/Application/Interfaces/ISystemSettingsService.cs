using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface ISystemSettingsService
{
    Task<ServiceResult<SystemSettingsDto>> GetAsync();
    Task<ServiceResult<SystemSettingsDto>> UpdateAsync(UpdateSystemSettingsRequestDto request);
}
