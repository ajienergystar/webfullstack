using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class PurchaseService : IPurchaseService
{
    private readonly IPurchaseRepository _repository;

    public PurchaseService(IPurchaseRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<PurchaseFormDataDto>> GetFormDataAsync()
    {
        try
        {
            return ServiceResult<PurchaseFormDataDto>.Success(await _repository.GetFormDataAsync());
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<PurchaseFormDataDto>.Failure(
                "Tabel Purchases belum ada. Jalankan database/pos/init.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<PurchaseFormDataDto>.Failure("Gagal memuat data form pembelian.");
        }
    }

    public async Task<ServiceResult<PurchaseListResponseDto>> GetListAsync(
        string? search, DateTime? dateFrom, DateTime? dateTo, int? supplierId)
    {
        try
        {
            return ServiceResult<PurchaseListResponseDto>.Success(
                await _repository.GetListAsync(search, dateFrom, dateTo, supplierId));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<PurchaseListResponseDto>.Failure(
                "Tabel Purchases belum ada. Jalankan database/pos/init.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<PurchaseListResponseDto>.Failure("Gagal memuat daftar purchase order.");
        }
    }

    public async Task<ServiceResult<PurchaseDetailResponseDto>> GetByIdAsync(long id)
    {
        if (id <= 0) return ServiceResult<PurchaseDetailResponseDto>.Failure("ID purchase order tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<PurchaseDetailResponseDto>.Failure("Purchase order tidak ditemukan.")
                : ServiceResult<PurchaseDetailResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<PurchaseDetailResponseDto>.Failure("Gagal memuat detail purchase order.");
        }
    }

    public async Task<ServiceResult<PurchaseMutationResponseDto>> CreateAsync(CreatePurchaseRequestDto request)
    {
        var err = Validate(request.PurchaseDate, request.Items, request.InvoiceNumber);
        if (err is not null) return ServiceResult<PurchaseMutationResponseDto>.Failure(err);

        try
        {
            var result = await _repository.CreateAsync(request);
            return ServiceResult<PurchaseMutationResponseDto>.Success(result);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<PurchaseMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<PurchaseMutationResponseDto>.Failure(
                "Tabel Purchases belum ada. Jalankan database/pos/init.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<PurchaseMutationResponseDto>.Failure("Gagal menyimpan purchase order.");
        }
    }

    public async Task<ServiceResult<PurchaseMutationResponseDto>> UpdateAsync(
        long id, UpdatePurchaseRequestDto request)
    {
        if (id <= 0) return ServiceResult<PurchaseMutationResponseDto>.Failure("ID purchase order tidak valid.");

        var err = Validate(request.PurchaseDate, request.Items, request.InvoiceNumber);
        if (err is not null) return ServiceResult<PurchaseMutationResponseDto>.Failure(err);

        try
        {
            var result = await _repository.UpdateAsync(id, request);
            return ServiceResult<PurchaseMutationResponseDto>.Success(result);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<PurchaseMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<PurchaseMutationResponseDto>.Failure("Gagal memperbarui purchase order.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(long id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID purchase order tidak valid.");
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
            return ServiceResult<bool>.Failure("Gagal menghapus purchase order.");
        }
    }

    private static string? Validate(
        DateTime purchaseDate, List<CreatePurchaseItemDto> items, string? invoiceNumber)
    {
        if (purchaseDate == default)
            return "Tanggal pembelian wajib diisi.";
        if (!string.IsNullOrWhiteSpace(invoiceNumber) && invoiceNumber.Trim().Length > 50)
            return "Nomor invoice maksimal 50 karakter.";
        if (items is null || items.Count == 0)
            return "Minimal satu item produk wajib diisi.";

        foreach (var item in items)
        {
            if (item.ProductId <= 0)
                return "Produk tidak valid.";
            if (item.Qty <= 0)
                return "Qty harus lebih dari 0.";
            if (item.Price < 0)
                return "Harga beli tidak boleh negatif.";
        }

        var duplicate = items.GroupBy(i => i.ProductId).FirstOrDefault(g => g.Count() > 1);
        if (duplicate is not null)
            return "Produk duplikat dalam satu PO. Gabungkan qty pada baris yang sama.";

        return null;
    }
}
