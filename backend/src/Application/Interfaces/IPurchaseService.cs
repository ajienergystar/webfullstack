using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IPurchaseService
{
    Task<ServiceResult<PurchaseFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<PurchaseListResponseDto>> GetListAsync(
        string? search, DateTime? dateFrom, DateTime? dateTo, int? supplierId);
    Task<ServiceResult<PurchaseDetailResponseDto>> GetByIdAsync(long id);
    Task<ServiceResult<PurchaseMutationResponseDto>> CreateAsync(CreatePurchaseRequestDto request);
    Task<ServiceResult<PurchaseMutationResponseDto>> UpdateAsync(long id, UpdatePurchaseRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(long id);
}
