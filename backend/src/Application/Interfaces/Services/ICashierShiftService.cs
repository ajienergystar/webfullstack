using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface ICashierShiftService
{
    Task<ServiceResult<CashierShiftFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<CashierShiftListResponseDto>> GetAllAsync();
    Task<ServiceResult<CashierShiftDetailDto>> GetByIdAsync(long id);
    Task<ServiceResult<CreateCashierShiftResponseDto>> CreateAsync(CreateCashierShiftRequestDto request);
    Task<ServiceResult<MessageResponseDto>> UpdateAsync(long id, UpdateCashierShiftRequestDto request);
    Task<ServiceResult<CashierReportResponseDto>> GetReportAsync(CashierReportFilterDto filter);
}
