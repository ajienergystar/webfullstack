using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IStockTransferRepository
{
    Task<StockTransferFormDataDto> GetFormDataAsync();
    Task<StockTransferListResponseDto> GetListAsync(
        string? search, DateTime? dateFrom, DateTime? dateTo, int? fromOutletId, int? toOutletId);
    Task<StockTransferDetailResponseDto?> GetByIdAsync(long id);
    Task<StockTransferMutationResponseDto> CreateAsync(CreateStockTransferRequestDto request);
    Task<StockTransferMutationResponseDto> UpdateAsync(long id, UpdateStockTransferRequestDto request);
    Task DeleteAsync(long id);
    Task<bool> OutletExistsAsync(int outletId);
}
