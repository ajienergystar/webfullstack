using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IHoldRepository
{
    Task<HoldListResponseDto> GetActiveHoldsAsync();
    Task<HoldDetailDto?> GetByIdAsync(long id);
    Task<CreateHoldResponseDto> CreateAsync(CreateHoldRequestDto request);
    Task<CreateHoldResponseDto> UpdateAsync(long id, UpdateHoldRequestDto request);
    Task CancelAsync(long id);
    Task<CompleteHoldResponseDto> CompleteAsync(long id, CompleteHoldRequestDto request);
}
