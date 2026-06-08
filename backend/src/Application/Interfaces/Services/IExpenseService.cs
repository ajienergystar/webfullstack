using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IExpenseService
{
    Task<ServiceResult<ExpenseListResponseDto>> GetListAsync(string? search, DateTime? dateFrom, DateTime? dateTo);
    Task<ServiceResult<ExpenseListItemDto>> GetByIdAsync(long id);
    Task<ServiceResult<ExpenseMutationResponseDto>> CreateAsync(CreateExpenseRequestDto request);
    Task<ServiceResult<ExpenseMutationResponseDto>> UpdateAsync(long id, UpdateExpenseRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(long id);
}
