using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface ISalesRepository
{
    Task<SalesFormDataDto> GetFormDataAsync();
    Task<CreateSaleResponseDto> CreateSaleAsync(CreateSaleRequestDto request);
    Task<SalesHistoryResponseDto> GetHistoryAsync(SalesHistoryFilterDto filter);
    Task<SalesTransactionDetailDto?> GetTransactionByIdAsync(long id);
}
