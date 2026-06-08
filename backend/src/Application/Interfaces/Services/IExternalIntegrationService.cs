using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IExternalIntegrationService
{
    Task<ServiceResult<ExternalIntegrationListResponseDto>> GetListAsync(
        string? search, bool? isActive, string? integrationType, string? provider, int? outletId);
    Task<ServiceResult<ExternalIntegrationDetailDto>> GetByIdAsync(int id);
    Task<ServiceResult<ExternalIntegrationMutationResponseDto>> CreateAsync(
        CreateExternalIntegrationRequestDto request);
    Task<ServiceResult<ExternalIntegrationMutationResponseDto>> UpdateAsync(
        int id, UpdateExternalIntegrationRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
