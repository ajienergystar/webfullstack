using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface ITaxService
{
    Task<ServiceResult<TaxListResponseDto>> GetListAsync(string? search, string? taxType, bool? isActive);
    Task<ServiceResult<TaxListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<TaxMutationResponseDto>> CreateAsync(CreateTaxRequestDto request);
    Task<ServiceResult<TaxMutationResponseDto>> UpdateAsync(int id, UpdateTaxRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
