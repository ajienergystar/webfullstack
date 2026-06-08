using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface ICustomerService
{
    Task<ServiceResult<CustomerListResponseDto>> GetListAsync(string? search);
    Task<ServiceResult<CustomerListItemDto>> GetByIdAsync(int id);
    Task<ServiceResult<CustomerMutationResponseDto>> CreateAsync(CreateCustomerRequestDto request);
    Task<ServiceResult<CustomerMutationResponseDto>> UpdateAsync(int id, UpdateCustomerRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}
