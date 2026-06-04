using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IExpenseRepository
{
    Task<ExpenseListResponseDto> GetListAsync(string? search, DateTime? dateFrom, DateTime? dateTo);
    Task<ExpenseListItemDto?> GetByIdAsync(long id);
    Task<long> CreateAsync(CreateExpenseRequestDto request);
    Task UpdateAsync(long id, UpdateExpenseRequestDto request);
    Task DeleteAsync(long id);
}
