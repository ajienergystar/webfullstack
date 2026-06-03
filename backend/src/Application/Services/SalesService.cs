using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class SalesService : ISalesService
{
    private static readonly HashSet<string> AllowedPaymentMethods =
        ["Cash", "QRIS", "Transfer", "Debit", "Credit"];

    private readonly ISalesRepository _salesRepository;

    public SalesService(ISalesRepository salesRepository)
    {
        _salesRepository = salesRepository;
    }

    public async Task<ServiceResult<SalesFormDataDto>> GetFormDataAsync()
    {
        try
        {
            var data = await _salesRepository.GetFormDataAsync();
            return ServiceResult<SalesFormDataDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<SalesFormDataDto>.Failure(
                "Gagal memuat data penjualan. Pastikan database POS sudah diinisialisasi.");
        }
    }

    public async Task<ServiceResult<CreateSaleResponseDto>> CreateSaleAsync(CreateSaleRequestDto request)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
        {
            return ServiceResult<CreateSaleResponseDto>.Failure(validationError);
        }

        try
        {
            var result = await _salesRepository.CreateSaleAsync(request);
            return ServiceResult<CreateSaleResponseDto>.Success(result);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<CreateSaleResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<CreateSaleResponseDto>.Failure(
                "Gagal menyimpan transaksi penjualan.");
        }
    }

    private static string? ValidateRequest(CreateSaleRequestDto request)
    {
        if (request.UserId <= 0)
        {
            return "Kasir wajib dipilih.";
        }

        if (request.OutletId <= 0)
        {
            return "Outlet wajib dipilih.";
        }

        if (request.Items.Count == 0)
        {
            return "Minimal satu produk harus ditambahkan.";
        }

        if (!AllowedPaymentMethods.Contains(request.PaymentMethod))
        {
            return "Metode pembayaran tidak valid.";
        }

        foreach (var item in request.Items)
        {
            if (item.ProductId <= 0 || item.Qty <= 0)
            {
                return "Qty produk harus lebih dari 0.";
            }

            if (item.Price < 0 || item.Discount < 0)
            {
                return "Harga atau diskon tidak valid.";
            }
        }

        var subTotal = request.Items.Sum(i => i.Qty * i.Price - i.Discount);
        if (subTotal < 0)
        {
            return "Subtotal tidak valid.";
        }

        if (request.Discount < 0 || request.Tax < 0)
        {
            return "Diskon atau pajak tidak valid.";
        }

        var grandTotal = subTotal - request.Discount + request.Tax;
        if (grandTotal < 0)
        {
            return "Total transaksi tidak valid.";
        }

        if (request.PaidAmount < grandTotal)
        {
            return "Jumlah bayar kurang dari total.";
        }

        return null;
    }

    public async Task<ServiceResult<SalesHistoryResponseDto>> GetHistoryAsync(SalesHistoryFilterDto filter)
    {
        try
        {
            var data = await _salesRepository.GetHistoryAsync(filter);
            return ServiceResult<SalesHistoryResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<SalesHistoryResponseDto>.Failure(
                "Gagal memuat riwayat transaksi.");
        }
    }

    public async Task<ServiceResult<SalesTransactionDetailDto>> GetTransactionByIdAsync(long id)
    {
        if (id <= 0)
        {
            return ServiceResult<SalesTransactionDetailDto>.Failure("ID transaksi tidak valid.");
        }

        try
        {
            var data = await _salesRepository.GetTransactionByIdAsync(id);
            if (data is null)
            {
                return ServiceResult<SalesTransactionDetailDto>.Failure("Transaksi tidak ditemukan.");
            }

            return ServiceResult<SalesTransactionDetailDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<SalesTransactionDetailDto>.Failure(
                "Gagal memuat detail transaksi.");
        }
    }
}
