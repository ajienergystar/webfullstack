using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IPrinterRepository
{
    Task<PrinterListResponseDto> GetListAsync(string? search, bool? isActive, string? connectionType, int? outletId);
    Task<PrinterListItemDto?> GetByIdAsync(int id);
    Task<PrinterMutationResponseDto> CreateAsync(CreatePrinterRequestDto request);
    Task<PrinterMutationResponseDto> UpdateAsync(int id, UpdatePrinterRequestDto request);
    Task DeleteAsync(int id);
}
