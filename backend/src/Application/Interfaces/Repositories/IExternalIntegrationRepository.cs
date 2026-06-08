using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IExternalIntegrationRepository
{
    Task<ExternalIntegrationListResponseDto> GetListAsync(
        string? search, bool? isActive, string? integrationType, string? provider, int? outletId);
    Task<ExternalIntegrationDetailDto?> GetByIdAsync(int id);
    Task<ExternalIntegrationMutationResponseDto> CreateAsync(CreateExternalIntegrationRequestDto request);
    Task<ExternalIntegrationMutationResponseDto> UpdateAsync(int id, UpdateExternalIntegrationRequestDto request);
    Task DeleteAsync(int id);
}
