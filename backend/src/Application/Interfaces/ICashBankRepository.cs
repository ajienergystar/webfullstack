using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface ICashBankRepository
{
    Task<CashBankFormDataDto> GetFormDataAsync();
    Task<CashAccountListResponseDto> GetAccountsAsync(string? search, string? accountType);
    Task<CashAccountListItemDto?> GetAccountByIdAsync(int id);
    Task<bool> AccountCodeExistsAsync(string code, int? excludeId = null);
    Task<int> CreateAccountAsync(CreateCashAccountRequestDto request);
    Task UpdateAccountAsync(int id, UpdateCashAccountRequestDto request);
    Task DeleteAccountAsync(int id);
    Task<bool> AccountHasTransactionsAsync(int id);

    Task<CashTransactionListResponseDto> GetTransactionsAsync(
        int? accountId, string? transactionType, DateTime? dateFrom, DateTime? dateTo);
    Task<CashTransactionListItemDto?> GetTransactionByIdAsync(long id);
    Task<long> CreateTransactionAsync(CreateCashTransactionRequestDto request);
    Task UpdateTransactionAsync(long id, UpdateCashTransactionRequestDto request, decimal previousAmount, string previousType);
    Task DeleteTransactionAsync(long id, decimal amount, string transactionType);
}
