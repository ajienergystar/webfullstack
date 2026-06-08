using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IPrinterService
{
    Task<ServiceResult<PrinterListResponseDto>> GetListAsync(
        string? search, bool? isActive, string? connectionType, int? outletId);
    Task<ServiceResult<PrinterListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<PrinterMutationResponseDto>> CreateAsync(CreatePrinterRequestDto request);
    Task<ServiceResult<PrinterMutationResponseDto>> UpdateAsync(int id, UpdatePrinterRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
