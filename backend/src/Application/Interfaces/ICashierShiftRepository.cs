using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface ICashierShiftRepository
{
    Task<CashierShiftFormDataDto> GetFormDataAsync();
    Task<CashierShiftListResponseDto> GetAllAsync();
    Task<CashierShiftDetailDto?> GetByIdAsync(long id);
    Task<bool> UserExistsAsync(int userId);
    Task<bool> HasOpenShiftAsync(int userId, long? excludeId = null);
    Task<long> CreateAsync(CreateCashierShiftRequestDto request);
    Task UpdateAsync(long id, UpdateCashierShiftRequestDto request);
}
