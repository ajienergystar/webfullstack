using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface ITaxRepository
{
    Task<TaxListResponseDto> GetListAsync(string? search, string? taxType, bool? isActive);
    Task<TaxListItemDto?> GetByIdAsync(int id);
    Task<int> CreateAsync(CreateTaxRequestDto request);
    Task UpdateAsync(int id, UpdateTaxRequestDto request);
    Task DeleteAsync(int id);
    Task ClearDefaultExceptAsync(int? exceptId);
}
