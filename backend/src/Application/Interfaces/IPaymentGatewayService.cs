using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IPaymentGatewayService
{
    Task<ServiceResult<PaymentGatewayListResponseDto>> GetListAsync(
        string? search, bool? isActive, string? provider, int? outletId);
    Task<ServiceResult<PaymentGatewayDetailDto>> GetByIdAsync(int id);
    Task<ServiceResult<PaymentGatewayMutationResponseDto>> CreateAsync(CreatePaymentGatewayRequestDto request);
    Task<ServiceResult<PaymentGatewayMutationResponseDto>> UpdateAsync(
        int id, UpdatePaymentGatewayRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
