using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface ICashBankService
{
    Task<ServiceResult<CashBankFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<CashAccountListResponseDto>> GetAccountsAsync(string? search, string? accountType);
    Task<ServiceResult<CashAccountListItemDto>> GetAccountByIdAsync(int id);
    Task<ServiceResult<CashAccountMutationResponseDto>> CreateAccountAsync(CreateCashAccountRequestDto request);
    Task<ServiceResult<CashAccountMutationResponseDto>> UpdateAccountAsync(int id, UpdateCashAccountRequestDto request);
    Task<ServiceResult<bool>> DeleteAccountAsync(int id);

    Task<ServiceResult<CashTransactionListResponseDto>> GetTransactionsAsync(
        int? accountId, string? transactionType, DateTime? dateFrom, DateTime? dateTo);
    Task<ServiceResult<CashTransactionListItemDto>> GetTransactionByIdAsync(long id);
    Task<ServiceResult<CashTransactionMutationResponseDto>> CreateTransactionAsync(CreateCashTransactionRequestDto request);
    Task<ServiceResult<CashTransactionMutationResponseDto>> UpdateTransactionAsync(long id, UpdateCashTransactionRequestDto request);
    Task<ServiceResult<bool>> DeleteTransactionAsync(long id);
}
