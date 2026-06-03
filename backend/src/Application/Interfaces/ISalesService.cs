using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface ISalesService
{
    Task<ServiceResult<SalesFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<CreateSaleResponseDto>> CreateSaleAsync(CreateSaleRequestDto request);
    Task<ServiceResult<SalesHistoryResponseDto>> GetHistoryAsync(SalesHistoryFilterDto filter);
    Task<ServiceResult<SalesTransactionDetailDto>> GetTransactionByIdAsync(long id);
}
