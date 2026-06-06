using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IPaymentGatewayRepository
{
    Task<PaymentGatewayListResponseDto> GetListAsync(
        string? search, bool? isActive, string? provider, int? outletId);
    Task<PaymentGatewayDetailDto?> GetByIdAsync(int id);
    Task<PaymentGatewayMutationResponseDto> CreateAsync(CreatePaymentGatewayRequestDto request);
    Task<PaymentGatewayMutationResponseDto> UpdateAsync(int id, UpdatePaymentGatewayRequestDto request);
    Task DeleteAsync(int id);
}
