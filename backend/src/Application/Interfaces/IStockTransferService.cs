using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IStockTransferService
{
    Task<ServiceResult<StockTransferFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<StockTransferListResponseDto>> GetListAsync(
        string? search, DateTime? dateFrom, DateTime? dateTo, int? fromOutletId, int? toOutletId);
    Task<ServiceResult<StockTransferDetailResponseDto>> GetByIdAsync(long id);
    Task<ServiceResult<StockTransferMutationResponseDto>> CreateAsync(CreateStockTransferRequestDto request);
    Task<ServiceResult<StockTransferMutationResponseDto>> UpdateAsync(long id, UpdateStockTransferRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(long id);
}
