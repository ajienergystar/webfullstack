using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IStockRepository
{
    Task<StockOverviewResponseDto> GetOverviewAsync(string? search, bool lowStockOnly);
    Task<StockMovementListResponseDto> GetMovementsAsync(string? search, string? movementType, int? productId);
    Task<StockFormDataDto> GetFormDataAsync();
    Task<StockAdjustmentResponseDto> AdjustStockAsync(CreateStockAdjustmentRequestDto request);
    Task<GoodsReceiptResponseDto> ReceiveGoodsAsync(CreateGoodsReceiptRequestDto request);
}
