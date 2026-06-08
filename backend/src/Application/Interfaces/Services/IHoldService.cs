using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IHoldService
{
    Task<ServiceResult<HoldListResponseDto>> GetActiveHoldsAsync();
    Task<ServiceResult<HoldDetailDto>> GetByIdAsync(long id);
    Task<ServiceResult<CreateHoldResponseDto>> CreateAsync(CreateHoldRequestDto request);
    Task<ServiceResult<CreateHoldResponseDto>> UpdateAsync(long id, UpdateHoldRequestDto request);
    Task<ServiceResult<bool>> CancelAsync(long id);
    Task<ServiceResult<CompleteHoldResponseDto>> CompleteAsync(long id, CompleteHoldRequestDto request);
}
