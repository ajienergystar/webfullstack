using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IOnlineOrderService
{
    Task<ServiceResult<OnlineOrderListResponseDto>> GetListAsync(
        string? search,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? orderStatus,
        string? paymentStatus,
        string? orderSource,
        int? outletId);

    Task<ServiceResult<OnlineOrderDetailDto>> GetByIdAsync(long id);

    Task<ServiceResult<bool>> UpdateStatusAsync(long id, UpdateOnlineOrderStatusRequestDto request);

    Task<ServiceResult<CompleteOnlineOrderResponseDto>> CompleteAsync(long id, CompleteOnlineOrderRequestDto request);
}
