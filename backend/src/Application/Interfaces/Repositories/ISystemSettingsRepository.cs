using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface ISystemSettingsRepository
{
    Task<SystemSettingsDto?> GetAsync();
    Task<SystemSettingsDto> UpdateAsync(UpdateSystemSettingsRequestDto request, int? updatedByUserId);
}
