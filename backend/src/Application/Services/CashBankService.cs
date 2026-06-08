using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class CashBankService : ICashBankService
{
    private static readonly HashSet<string> AllowedAccountTypes = ["Cash", "Bank"];
    private static readonly HashSet<string> AllowedTransactionTypes = ["IN", "OUT"];

    private readonly ICashBankRepository _repository;

    public CashBankService(ICashBankRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<CashBankFormDataDto>> GetFormDataAsync()
    {
        try
        {
            return ServiceResult<CashBankFormDataDto>.Success(await _repository.GetFormDataAsync());
        }
        catch (Exception)
        {
            return ServiceResult<CashBankFormDataDto>.Failure("Gagal memuat data form kas & bank.");
        }
    }

    public async Task<ServiceResult<CashAccountListResponseDto>> GetAccountsAsync(string? search, string? accountType)
    {
        try
        {
            return ServiceResult<CashAccountListResponseDto>.Success(
                await _repository.GetAccountsAsync(search, accountType));
        }
        catch (Exception)
        {
            return ServiceResult<CashAccountListResponseDto>.Failure("Gagal memuat daftar akun kas & bank.");
        }
    }

    public async Task<ServiceResult<CashAccountListItemDto>> GetAccountByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<CashAccountListItemDto>.Failure("ID akun tidak valid.");
        try
        {
            var data = await _repository.GetAccountByIdAsync(id);
            return data is null
                ? ServiceResult<CashAccountListItemDto>.Failure("Akun tidak ditemukan.")
                : ServiceResult<CashAccountListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<CashAccountListItemDto>.Failure("Gagal memuat detail akun.");
        }
    }

    public async Task<ServiceResult<CashAccountMutationResponseDto>> CreateAccountAsync(
        CreateCashAccountRequestDto request)
    {
        var err = ValidateAccount(request);
        if (err is not null) return ServiceResult<CashAccountMutationResponseDto>.Failure(err);

        request.AccountCode = request.AccountCode.Trim().ToUpperInvariant();
        try
        {
            if (await _repository.AccountCodeExistsAsync(request.AccountCode))
                return ServiceResult<CashAccountMutationResponseDto>.Failure("Kode akun sudah digunakan.");

            var id = await _repository.CreateAccountAsync(request);
            return ServiceResult<CashAccountMutationResponseDto>.Success(new CashAccountMutationResponseDto
            {
                Id = id,
                AccountCode = request.AccountCode
            });
        }
        catch (Exception)
        {
            return ServiceResult<CashAccountMutationResponseDto>.Failure("Gagal menyimpan akun kas & bank.");
        }
    }

    public async Task<ServiceResult<CashAccountMutationResponseDto>> UpdateAccountAsync(
        int id, UpdateCashAccountRequestDto request)
    {
        if (id <= 0) return ServiceResult<CashAccountMutationResponseDto>.Failure("ID akun tidak valid.");
        var err = ValidateAccount(request);
        if (err is not null) return ServiceResult<CashAccountMutationResponseDto>.Failure(err);

        request.AccountCode = request.AccountCode.Trim().ToUpperInvariant();
        try
        {
            if (await _repository.GetAccountByIdAsync(id) is null)
                return ServiceResult<CashAccountMutationResponseDto>.Failure("Akun tidak ditemukan.");

            if (await _repository.AccountCodeExistsAsync(request.AccountCode, id))
                return ServiceResult<CashAccountMutationResponseDto>.Failure("Kode akun sudah digunakan.");

            await _repository.UpdateAccountAsync(id, request);
            return ServiceResult<CashAccountMutationResponseDto>.Success(new CashAccountMutationResponseDto
            {
                Id = id,
                AccountCode = request.AccountCode
            });
        }
        catch (Exception)
        {
            return ServiceResult<CashAccountMutationResponseDto>.Failure("Gagal memperbarui akun kas & bank.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAccountAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID akun tidak valid.");
        try
        {
            if (await _repository.GetAccountByIdAsync(id) is null)
                return ServiceResult<bool>.Failure("Akun tidak ditemukan.");

            if (await _repository.AccountHasTransactionsAsync(id))
                return ServiceResult<bool>.Failure("Akun tidak dapat dihapus karena sudah memiliki transaksi.");

            await _repository.DeleteAccountAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus akun.");
        }
    }

    public async Task<ServiceResult<CashTransactionListResponseDto>> GetTransactionsAsync(
        int? accountId, string? transactionType, DateTime? dateFrom, DateTime? dateTo)
    {
        try
        {
            return ServiceResult<CashTransactionListResponseDto>.Success(
                await _repository.GetTransactionsAsync(accountId, transactionType, dateFrom, dateTo));
        }
        catch (Exception)
        {
            return ServiceResult<CashTransactionListResponseDto>.Failure("Gagal memuat transaksi kas.");
        }
    }

    public async Task<ServiceResult<CashTransactionListItemDto>> GetTransactionByIdAsync(long id)
    {
        if (id <= 0) return ServiceResult<CashTransactionListItemDto>.Failure("ID transaksi tidak valid.");
        try
        {
            var data = await _repository.GetTransactionByIdAsync(id);
            return data is null
                ? ServiceResult<CashTransactionListItemDto>.Failure("Transaksi tidak ditemukan.")
                : ServiceResult<CashTransactionListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<CashTransactionListItemDto>.Failure("Gagal memuat detail transaksi.");
        }
    }

    public async Task<ServiceResult<CashTransactionMutationResponseDto>> CreateTransactionAsync(
        CreateCashTransactionRequestDto request)
    {
        var err = ValidateTransaction(request);
        if (err is not null) return ServiceResult<CashTransactionMutationResponseDto>.Failure(err);

        try
        {
            if (await _repository.GetAccountByIdAsync(request.CashAccountId) is null)
                return ServiceResult<CashTransactionMutationResponseDto>.Failure("Akun kas/bank tidak ditemukan.");

            if (request.TransactionType == "OUT")
            {
                var accounts = await _repository.GetAccountsAsync(null, null);
                var account = accounts.Accounts.FirstOrDefault(a => a.Id == request.CashAccountId);
                if (account is not null && account.CurrentBalance < request.Amount)
                    return ServiceResult<CashTransactionMutationResponseDto>.Failure(
                        "Saldo akun tidak mencukupi untuk kas keluar.");
            }

            var id = await _repository.CreateTransactionAsync(request);
            return ServiceResult<CashTransactionMutationResponseDto>.Success(
                new CashTransactionMutationResponseDto
                {
                    Id = id,
                    ReferenceNumber = request.ReferenceNumber
                });
        }
        catch (Exception)
        {
            return ServiceResult<CashTransactionMutationResponseDto>.Failure("Gagal menyimpan transaksi kas.");
        }
    }

    public async Task<ServiceResult<CashTransactionMutationResponseDto>> UpdateTransactionAsync(
        long id, UpdateCashTransactionRequestDto request)
    {
        if (id <= 0) return ServiceResult<CashTransactionMutationResponseDto>.Failure("ID transaksi tidak valid.");
        var err = ValidateTransaction(request);
        if (err is not null) return ServiceResult<CashTransactionMutationResponseDto>.Failure(err);

        try
        {
            var existing = await _repository.GetTransactionByIdAsync(id);
            if (existing is null)
                return ServiceResult<CashTransactionMutationResponseDto>.Failure("Transaksi tidak ditemukan.");

            if (request.TransactionType == "OUT")
            {
                var accounts = await _repository.GetAccountsAsync(null, null);
                var account = accounts.Accounts.FirstOrDefault(a => a.Id == request.CashAccountId);
                if (account is not null)
                {
                    var adjusted = account.CurrentBalance;
                    if (existing.CashAccountId == request.CashAccountId)
                    {
                        adjusted += existing.TransactionType == "IN" ? -existing.Amount : existing.Amount;
                    }
                    if (adjusted < request.Amount)
                        return ServiceResult<CashTransactionMutationResponseDto>.Failure(
                            "Saldo akun tidak mencukupi untuk kas keluar.");
                }
            }

            await _repository.UpdateTransactionAsync(id, request, existing.Amount, existing.TransactionType);
            return ServiceResult<CashTransactionMutationResponseDto>.Success(
                new CashTransactionMutationResponseDto
                {
                    Id = id,
                    ReferenceNumber = request.ReferenceNumber
                });
        }
        catch (Exception)
        {
            return ServiceResult<CashTransactionMutationResponseDto>.Failure("Gagal memperbarui transaksi kas.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteTransactionAsync(long id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID transaksi tidak valid.");
        try
        {
            var existing = await _repository.GetTransactionByIdAsync(id);
            if (existing is null) return ServiceResult<bool>.Failure("Transaksi tidak ditemukan.");

            await _repository.DeleteTransactionAsync(id, existing.Amount, existing.TransactionType);
            return ServiceResult<bool>.Success(true);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus transaksi.");
        }
    }

    private static string? ValidateAccount(CreateCashAccountRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountCode))
            return "Kode akun wajib diisi.";
        if (string.IsNullOrWhiteSpace(request.AccountName))
            return "Nama akun wajib diisi.";
        if (string.IsNullOrWhiteSpace(request.AccountType) ||
            !AllowedAccountTypes.Contains(request.AccountType.Trim()))
            return "Tipe akun harus Cash atau Bank.";
        if (request.AccountType.Trim() == "Bank" && string.IsNullOrWhiteSpace(request.BankName))
            return "Nama bank wajib diisi untuk tipe Bank.";
        if (request.OpeningBalance < 0)
            return "Saldo awal tidak boleh negatif.";
        return null;
    }

    private static string? ValidateTransaction(CreateCashTransactionRequestDto request)
    {
        if (request.CashAccountId <= 0)
            return "Akun kas/bank wajib dipilih.";
        if (string.IsNullOrWhiteSpace(request.TransactionType) ||
            !AllowedTransactionTypes.Contains(request.TransactionType.Trim().ToUpperInvariant()))
            return "Tipe transaksi harus IN (masuk) atau OUT (keluar).";
        request.TransactionType = request.TransactionType.Trim().ToUpperInvariant();
        if (request.Amount <= 0)
            return "Nominal harus lebih dari 0.";
        if (request.TransactionDate == default)
            return "Tanggal transaksi wajib diisi.";
        return null;
    }
}
