using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IVoucherRepository
{
    Task<VoucherListResponseDto> GetListAsync(string? search, bool? isActive);
    Task<VoucherListItemDto?> GetByIdAsync(int id);
    Task<VoucherMutationResponseDto> CreateAsync(CreateVoucherRequestDto request);
    Task<VoucherMutationResponseDto> UpdateAsync(int id, UpdateVoucherRequestDto request);
    Task DeleteAsync(int id);
}
