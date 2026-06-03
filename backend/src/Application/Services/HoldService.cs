using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class HoldService : IHoldService
{
    private static readonly HashSet<string> AllowedPaymentMethods =
        ["Cash", "QRIS", "Transfer", "Debit", "Credit"];

    private readonly IHoldRepository _holdRepository;

    public HoldService(IHoldRepository holdRepository)
    {
        _holdRepository = holdRepository;
    }

    public async Task<ServiceResult<HoldListResponseDto>> GetActiveHoldsAsync()
    {
        try
        {
            var data = await _holdRepository.GetActiveHoldsAsync();
            return ServiceResult<HoldListResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<HoldListResponseDto>.Failure("Gagal memuat daftar hold transaksi.");
        }
    }

    public async Task<ServiceResult<HoldDetailDto>> GetByIdAsync(long id)
    {
        if (id <= 0) return ServiceResult<HoldDetailDto>.Failure("ID hold tidak valid.");
        try
        {
            var data = await _holdRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<HoldDetailDto>.Failure("Hold transaksi tidak ditemukan.")
                : ServiceResult<HoldDetailDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<HoldDetailDto>.Failure("Gagal memuat detail hold.");
        }
    }

    public async Task<ServiceResult<CreateHoldResponseDto>> CreateAsync(CreateHoldRequestDto request)
    {
        var err = ValidateHoldItems(request.Items, request.UserId, request.OutletId);
        if (err is not null) return ServiceResult<CreateHoldResponseDto>.Failure(err);
        try
        {
            var result = await _holdRepository.CreateAsync(request);
            return ServiceResult<CreateHoldResponseDto>.Success(result);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<CreateHoldResponseDto>.Failure(
                "Tabel HeldTransactions belum ada. Jalankan database/pos/hold-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<CreateHoldResponseDto>.Failure("Gagal menyimpan hold transaksi.");
        }
    }

    public async Task<ServiceResult<CreateHoldResponseDto>> UpdateAsync(long id, UpdateHoldRequestDto request)
    {
        var err = ValidateHoldItems(request.Items, request.UserId, request.OutletId);
        if (err is not null) return ServiceResult<CreateHoldResponseDto>.Failure(err);
        try
        {
            var result = await _holdRepository.UpdateAsync(id, request);
            return ServiceResult<CreateHoldResponseDto>.Success(result);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<CreateHoldResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<CreateHoldResponseDto>.Failure("Gagal memperbarui hold transaksi.");
        }
    }

    public async Task<ServiceResult<bool>> CancelAsync(long id)
    {
        try
        {
            await _holdRepository.CancelAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal membatalkan hold transaksi.");
        }
    }

    public async Task<ServiceResult<CompleteHoldResponseDto>> CompleteAsync(long id, CompleteHoldRequestDto request)
    {
        if (!AllowedPaymentMethods.Contains(request.PaymentMethod))
        {
            return ServiceResult<CompleteHoldResponseDto>.Failure("Metode pembayaran tidak valid.");
        }
        try
        {
            var result = await _holdRepository.CompleteAsync(id, request);
            return ServiceResult<CompleteHoldResponseDto>.Success(result);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<CompleteHoldResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<CompleteHoldResponseDto>.Failure("Gagal menyelesaikan hold transaksi.");
        }
    }

    private static string? ValidateHoldItems(List<CreateHoldItemDto> items, int userId, int outletId)
    {
        if (userId <= 0) return "Kasir wajib dipilih.";
        if (outletId <= 0) return "Outlet wajib dipilih.";
        if (items.Count == 0) return "Minimal satu produk harus ditambahkan.";
        foreach (var item in items)
        {
            if (item.ProductId <= 0 || item.Qty <= 0) return "Qty produk harus lebih dari 0.";
            if (item.Price < 0 || item.Discount < 0) return "Harga atau diskon tidak valid.";
        }
        return null;
    }
}
