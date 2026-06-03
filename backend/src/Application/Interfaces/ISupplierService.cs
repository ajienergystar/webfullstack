using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface ISupplierService
{
    Task<ServiceResult<SupplierListResponseDto>> GetListAsync(string? search);
    Task<ServiceResult<SupplierListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<SupplierMutationResponseDto>> CreateAsync(CreateSupplierRequestDto request);
    Task<ServiceResult<SupplierMutationResponseDto>> UpdateAsync(int id, UpdateSupplierRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
