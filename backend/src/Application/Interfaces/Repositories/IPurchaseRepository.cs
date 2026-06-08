using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IPurchaseRepository
{
    Task<PurchaseFormDataDto> GetFormDataAsync();
    Task<PurchaseListResponseDto> GetListAsync(
        string? search, DateTime? dateFrom, DateTime? dateTo, int? supplierId);
    Task<PurchaseDetailResponseDto?> GetByIdAsync(long id);
    Task<PurchaseMutationResponseDto> CreateAsync(CreatePurchaseRequestDto request);
    Task<PurchaseMutationResponseDto> UpdateAsync(long id, UpdatePurchaseRequestDto request);
    Task DeleteAsync(long id);
}
