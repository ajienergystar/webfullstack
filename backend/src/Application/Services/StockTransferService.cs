using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class StockTransferService : IStockTransferService
{
    private readonly IStockTransferRepository _repository;

    public StockTransferService(IStockTransferRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<StockTransferFormDataDto>> GetFormDataAsync()
    {
        try
        {
            return ServiceResult<StockTransferFormDataDto>.Success(await _repository.GetFormDataAsync());
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<StockTransferFormDataDto>.Failure(
                "Tabel StockTransfers belum ada. Jalankan database/pos/init.sql atau stock-transfer-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<StockTransferFormDataDto>.Failure("Gagal memuat data form transfer stok.");
        }
    }

    public async Task<ServiceResult<StockTransferListResponseDto>> GetListAsync(
        string? search, DateTime? dateFrom, DateTime? dateTo, int? fromOutletId, int? toOutletId)
    {
        try
        {
            return ServiceResult<StockTransferListResponseDto>.Success(
                await _repository.GetListAsync(search, dateFrom, dateTo, fromOutletId, toOutletId));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<StockTransferListResponseDto>.Failure(
                "Tabel StockTransfers belum ada. Jalankan database/pos/init.sql atau stock-transfer-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<StockTransferListResponseDto>.Failure("Gagal memuat daftar transfer stok.");
        }
    }

    public async Task<ServiceResult<StockTransferDetailResponseDto>> GetByIdAsync(long id)
    {
        if (id <= 0) return ServiceResult<StockTransferDetailResponseDto>.Failure("ID transfer tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<StockTransferDetailResponseDto>.Failure("Transfer stok tidak ditemukan.")
                : ServiceResult<StockTransferDetailResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<StockTransferDetailResponseDto>.Failure("Gagal memuat detail transfer stok.");
        }
    }

    public async Task<ServiceResult<StockTransferMutationResponseDto>> CreateAsync(
        CreateStockTransferRequestDto request)
    {
        var err = await ValidateAsync(request.FromOutletId, request.ToOutletId,
            request.TransferDate, request.Items, request.ReferenceNumber);
        if (err is not null) return ServiceResult<StockTransferMutationResponseDto>.Failure(err);

        try
        {
            return ServiceResult<StockTransferMutationResponseDto>.Success(
                await _repository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<StockTransferMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<StockTransferMutationResponseDto>.Failure(
                "Tabel StockTransfers belum ada. Jalankan database/pos/init.sql atau stock-transfer-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<StockTransferMutationResponseDto>.Failure("Gagal menyimpan transfer stok.");
        }
    }

    public async Task<ServiceResult<StockTransferMutationResponseDto>> UpdateAsync(
        long id, UpdateStockTransferRequestDto request)
    {
        if (id <= 0) return ServiceResult<StockTransferMutationResponseDto>.Failure("ID transfer tidak valid.");

        var err = await ValidateAsync(request.FromOutletId, request.ToOutletId,
            request.TransferDate, request.Items, request.ReferenceNumber);
        if (err is not null) return ServiceResult<StockTransferMutationResponseDto>.Failure(err);

        try
        {
            return ServiceResult<StockTransferMutationResponseDto>.Success(
                await _repository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<StockTransferMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<StockTransferMutationResponseDto>.Failure("Gagal memperbarui transfer stok.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(long id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID transfer tidak valid.");
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
            return ServiceResult<bool>.Failure("Gagal menghapus transfer stok.");
        }
    }

    private async Task<string?> ValidateAsync(
        int fromOutletId, int toOutletId, DateTime transferDate,
        List<CreateStockTransferItemDto> items, string? referenceNumber)
    {
        if (fromOutletId <= 0 || toOutletId <= 0)
            return "Outlet asal dan tujuan wajib dipilih.";

        if (fromOutletId == toOutletId)
            return "Outlet asal dan tujuan tidak boleh sama.";

        if (!await _repository.OutletExistsAsync(fromOutletId))
            return "Outlet asal tidak valid.";

        if (!await _repository.OutletExistsAsync(toOutletId))
            return "Outlet tujuan tidak valid.";

        if (transferDate == default)
            return "Tanggal transfer wajib diisi.";

        if (items.Count == 0)
            return "Minimal satu produk wajib ditambahkan.";

        if (!string.IsNullOrWhiteSpace(referenceNumber) && referenceNumber.Trim().Length > 50)
            return "Nomor referensi maksimal 50 karakter.";

        foreach (var item in items)
        {
            if (item.ProductId <= 0) return "Produk tidak valid.";
            if (item.Qty <= 0) return "Qty setiap produk harus lebih dari 0.";
        }

        return null;
    }
}
