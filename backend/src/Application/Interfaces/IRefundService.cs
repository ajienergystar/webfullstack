using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IRefundService
{
    Task<ServiceResult<RefundListResponseDto>> GetListAsync(string? invoiceNumber);
    Task<ServiceResult<SaleForRefundDto>> GetSaleForRefundAsync(long salesTransactionId);
    Task<ServiceResult<SaleForRefundDto>> GetSaleForRefundByInvoiceAsync(string invoiceNumber);
    Task<ServiceResult<RefundDetailDto>> GetByIdAsync(long id);
    Task<ServiceResult<CreateRefundResponseDto>> CreateAsync(CreateRefundRequestDto request);
}
