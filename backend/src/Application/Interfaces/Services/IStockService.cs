using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IStockService
{
    Task<ServiceResult<StockOverviewResponseDto>> GetOverviewAsync(string? search, bool lowStockOnly);
    Task<ServiceResult<StockMovementListResponseDto>> GetMovementsAsync(
        string? search, string? movementType, int? productId);
    Task<ServiceResult<StockFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<StockAdjustmentResponseDto>> AdjustStockAsync(CreateStockAdjustmentRequestDto request);
    Task<ServiceResult<GoodsReceiptResponseDto>> ReceiveGoodsAsync(CreateGoodsReceiptRequestDto request);
    Task<ServiceResult<PurchaseReturnResponseDto>> ReturnPurchaseAsync(CreatePurchaseReturnRequestDto request);
}
