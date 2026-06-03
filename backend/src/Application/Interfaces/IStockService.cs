using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IStockService
{
    Task<ServiceResult<StockOverviewResponseDto>> GetOverviewAsync(string? search, bool lowStockOnly);
    Task<ServiceResult<StockMovementListResponseDto>> GetMovementsAsync(
        string? search, string? movementType, int? productId);
    Task<ServiceResult<StockFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<StockAdjustmentResponseDto>> AdjustStockAsync(CreateStockAdjustmentRequestDto request);
}
