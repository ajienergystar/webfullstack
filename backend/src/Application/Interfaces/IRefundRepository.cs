using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IRefundRepository
{
    Task<RefundListResponseDto> GetListAsync(string? invoiceNumber = null);
    Task<SaleForRefundDto?> GetSaleForRefundAsync(long salesTransactionId);
    Task<SaleForRefundDto?> GetSaleForRefundByInvoiceAsync(string invoiceNumber);
    Task<RefundDetailDto?> GetByIdAsync(long id);
    Task<CreateRefundResponseDto> CreateAsync(CreateRefundRequestDto request);
}
