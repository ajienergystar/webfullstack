using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IOnlineOrderRepository
{
    Task<OnlineOrderListResponseDto> GetListAsync(
        string? search,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? orderStatus,
        string? paymentStatus,
        string? orderSource,
        int? outletId);

    Task<OnlineOrderDetailDto?> GetByIdAsync(long id);

    Task UpdateStatusAsync(long id, UpdateOnlineOrderStatusRequestDto request);

    Task<CompleteOnlineOrderResponseDto> CompleteAsync(long id, CompleteOnlineOrderRequestDto request);
}
