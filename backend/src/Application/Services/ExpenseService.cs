using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class ExpenseService : IExpenseService
{
    private readonly IExpenseRepository _repository;

    public ExpenseService(IExpenseRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<ExpenseListResponseDto>> GetListAsync(
        string? search, DateTime? dateFrom, DateTime? dateTo)
    {
        try
        {
            return ServiceResult<ExpenseListResponseDto>.Success(
                await _repository.GetListAsync(search, dateFrom, dateTo));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ExpenseListResponseDto>.Failure(
                "Tabel Expenses belum ada. Jalankan database/pos/init.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ExpenseListResponseDto>.Failure("Gagal memuat daftar pengeluaran.");
        }
    }

    public async Task<ServiceResult<ExpenseListItemDto>> GetByIdAsync(long id)
    {
        if (id <= 0) return ServiceResult<ExpenseListItemDto>.Failure("ID pengeluaran tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<ExpenseListItemDto>.Failure("Pengeluaran tidak ditemukan.")
                : ServiceResult<ExpenseListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<ExpenseListItemDto>.Failure("Gagal memuat detail pengeluaran.");
        }
    }

    public async Task<ServiceResult<ExpenseMutationResponseDto>> CreateAsync(CreateExpenseRequestDto request)
    {
        var err = Validate(request.ExpenseName, request.Amount, request.ExpenseDate);
        if (err is not null) return ServiceResult<ExpenseMutationResponseDto>.Failure(err);

        try
        {
            var id = await _repository.CreateAsync(request);
            return ServiceResult<ExpenseMutationResponseDto>.Success(new ExpenseMutationResponseDto
            {
                Id = id,
                ExpenseName = request.ExpenseName.Trim()
            });
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ExpenseMutationResponseDto>.Failure(
                "Tabel Expenses belum ada. Jalankan database/pos/init.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ExpenseMutationResponseDto>.Failure("Gagal menyimpan pengeluaran.");
        }
    }

    public async Task<ServiceResult<ExpenseMutationResponseDto>> UpdateAsync(
        long id, UpdateExpenseRequestDto request)
    {
        if (id <= 0) return ServiceResult<ExpenseMutationResponseDto>.Failure("ID pengeluaran tidak valid.");

        var err = Validate(request.ExpenseName, request.Amount, request.ExpenseDate);
        if (err is not null) return ServiceResult<ExpenseMutationResponseDto>.Failure(err);

        try
        {
            await _repository.UpdateAsync(id, request);
            return ServiceResult<ExpenseMutationResponseDto>.Success(new ExpenseMutationResponseDto
            {
                Id = id,
                ExpenseName = request.ExpenseName.Trim()
            });
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<ExpenseMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<ExpenseMutationResponseDto>.Failure("Gagal memperbarui pengeluaran.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(long id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID pengeluaran tidak valid.");
        try
        {
            await _repository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus pengeluaran.");
        }
    }

    private static string? Validate(string expenseName, decimal amount, DateTime expenseDate)
    {
        if (string.IsNullOrWhiteSpace(expenseName))
            return "Nama pengeluaran wajib diisi.";
        if (expenseName.Trim().Length > 100)
            return "Nama pengeluaran maksimal 100 karakter.";
        if (amount <= 0)
            return "Nominal harus lebih dari 0.";
        if (expenseDate == default)
            return "Tanggal pengeluaran wajib diisi.";
        return null;
    }
}
