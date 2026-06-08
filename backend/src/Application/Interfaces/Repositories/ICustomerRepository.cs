using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface ICustomerRepository
{
    Task<CustomerListResponseDto> GetListAsync(string? search);
    Task<CustomerListItemDto?> GetByIdAsync(int id);
    Task<CustomerMutationResponseDto> CreateAsync(CreateCustomerRequestDto request);
    Task<CustomerMutationResponseDto> UpdateAsync(int id, UpdateCustomerRequestDto request);
    Task DeleteAsync(int id);
}
