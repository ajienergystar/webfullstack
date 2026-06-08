using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class RefundService : IRefundService
{
    private static readonly HashSet<string> AllowedRefundMethods =
        ["Cash", "QRIS", "Transfer", "Debit", "Credit"];

    private readonly IRefundRepository _refundRepository;

    public RefundService(IRefundRepository refundRepository)
    {
        _refundRepository = refundRepository;
    }

    public async Task<ServiceResult<RefundListResponseDto>> GetListAsync(string? invoiceNumber)
    {
        try
        {
            return ServiceResult<RefundListResponseDto>.Success(
                await _refundRepository.GetListAsync(invoiceNumber));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<RefundListResponseDto>.Failure(
                "Tabel Refunds belum ada. Jalankan database/pos/refund-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<RefundListResponseDto>.Failure("Gagal memuat daftar refund.");
        }
    }

    public async Task<ServiceResult<SaleForRefundDto>> GetSaleForRefundAsync(long salesTransactionId)
    {
        if (salesTransactionId <= 0)
            return ServiceResult<SaleForRefundDto>.Failure("ID transaksi tidak valid.");

        try
        {
            var data = await _refundRepository.GetSaleForRefundAsync(salesTransactionId);
            return data is null
                ? ServiceResult<SaleForRefundDto>.Failure("Transaksi penjualan tidak ditemukan.")
                : ServiceResult<SaleForRefundDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<SaleForRefundDto>.Failure(
                "Tabel Refunds belum ada. Jalankan database/pos/refund-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<SaleForRefundDto>.Failure("Gagal memuat data transaksi.");
        }
    }

    public async Task<ServiceResult<SaleForRefundDto>> GetSaleForRefundByInvoiceAsync(string invoiceNumber)
    {
        if (string.IsNullOrWhiteSpace(invoiceNumber))
            return ServiceResult<SaleForRefundDto>.Failure("Nomor invoice wajib diisi.");

        try
        {
            var data = await _refundRepository.GetSaleForRefundByInvoiceAsync(invoiceNumber.Trim());
            return data is null
                ? ServiceResult<SaleForRefundDto>.Failure("Invoice tidak ditemukan.")
                : ServiceResult<SaleForRefundDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<SaleForRefundDto>.Failure(
                "Tabel Refunds belum ada. Jalankan database/pos/refund-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<SaleForRefundDto>.Failure("Gagal mencari transaksi.");
        }
    }

    public async Task<ServiceResult<RefundDetailDto>> GetByIdAsync(long id)
    {
        if (id <= 0) return ServiceResult<RefundDetailDto>.Failure("ID refund tidak valid.");
        try
        {
            var data = await _refundRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<RefundDetailDto>.Failure("Refund tidak ditemukan.")
                : ServiceResult<RefundDetailDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<RefundDetailDto>.Failure("Gagal memuat detail refund.");
        }
    }

    public async Task<ServiceResult<CreateRefundResponseDto>> CreateAsync(CreateRefundRequestDto request)
    {
        var err = ValidateRequest(request);
        if (err is not null) return ServiceResult<CreateRefundResponseDto>.Failure(err);

        try
        {
            var result = await _refundRepository.CreateAsync(request);
            return ServiceResult<CreateRefundResponseDto>.Success(result);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<CreateRefundResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<CreateRefundResponseDto>.Failure(
                "Tabel Refunds belum ada. Jalankan database/pos/refund-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<CreateRefundResponseDto>.Failure("Gagal menyimpan refund.");
        }
    }

    private static string? ValidateRequest(CreateRefundRequestDto request)
    {
        if (request.SalesTransactionId <= 0) return "Transaksi penjualan wajib dipilih.";
        if (request.UserId <= 0) return "Kasir wajib dipilih.";
        if (request.OutletId <= 0) return "Outlet wajib dipilih.";
        if (!AllowedRefundMethods.Contains(request.RefundMethod))
            return "Metode refund tidak valid.";
        if (request.Items.Count == 0) return "Pilih minimal satu item untuk direfund.";

        foreach (var item in request.Items)
        {
            if (item.Qty <= 0) return "Qty refund harus lebih dari 0.";
            if (item.Price < 0) return "Harga tidak valid.";
        }

        return null;
    }
}
