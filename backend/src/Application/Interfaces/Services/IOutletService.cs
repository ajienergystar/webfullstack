using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IOutletService
{
    Task<ServiceResult<OutletListResponseDto>> GetListAsync(string? search);
    Task<ServiceResult<OutletListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<OutletMutationResponseDto>> CreateAsync(CreateOutletRequestDto request);
    Task<ServiceResult<OutletMutationResponseDto>> UpdateAsync(int id, UpdateOutletRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
