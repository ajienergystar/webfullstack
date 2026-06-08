using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IVoucherService
{
    Task<ServiceResult<VoucherListResponseDto>> GetListAsync(string? search, bool? isActive);
    Task<ServiceResult<VoucherListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<VoucherMutationResponseDto>> CreateAsync(CreateVoucherRequestDto request);
    Task<ServiceResult<VoucherMutationResponseDto>> UpdateAsync(int id, UpdateVoucherRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
