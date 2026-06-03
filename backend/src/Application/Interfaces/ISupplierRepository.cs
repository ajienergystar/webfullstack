using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface ISupplierRepository
{
    Task<SupplierListResponseDto> GetListAsync(string? search);
    Task<SupplierListItemDto?> GetByIdAsync(int id);
    Task<SupplierMutationResponseDto> CreateAsync(CreateSupplierRequestDto request);
    Task<SupplierMutationResponseDto> UpdateAsync(int id, UpdateSupplierRequestDto request);
    Task DeleteAsync(int id);
}
