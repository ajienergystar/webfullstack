using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class HutangPiutangService : IHutangPiutangService
{
    private static readonly HashSet<string> AllowedTypes = ["PIUTANG", "HUTANG"];
    private static readonly HashSet<string> AllowedStatuses =
        ["OPEN", "PARTIAL", "PAID", "CANCELLED"];

    private readonly IHutangPiutangRepository _repository;

    public HutangPiutangService(IHutangPiutangRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<HutangPiutangListResponseDto>> GetListAsync(
        string? search, string? type, string? status, int? customerId)
    {
        try
        {
            return ServiceResult<HutangPiutangListResponseDto>.Success(
                await _repository.GetListAsync(search, type, status, customerId));
        }
        catch (Exception)
        {
            return ServiceResult<HutangPiutangListResponseDto>.Failure(
                "Gagal memuat daftar hutang/piutang.");
        }
    }

    public async Task<ServiceResult<HutangPiutangListItemDto>> GetByIdAsync(long id)
    {
        if (id <= 0)
            return ServiceResult<HutangPiutangListItemDto>.Failure("ID tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<HutangPiutangListItemDto>.Failure("Data tidak ditemukan.")
                : ServiceResult<HutangPiutangListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<HutangPiutangListItemDto>.Failure("Gagal memuat detail hutang/piutang.");
        }
    }

    public async Task<ServiceResult<List<HutangPiutangCustomerOptionDto>>> GetCustomersAsync()
    {
        try
        {
            return ServiceResult<List<HutangPiutangCustomerOptionDto>>.Success(
                await _repository.GetCustomersAsync());
        }
        catch (Exception)
        {
            return ServiceResult<List<HutangPiutangCustomerOptionDto>>.Failure(
                "Gagal memuat daftar pelanggan.");
        }
    }

    public async Task<ServiceResult<List<HutangPiutangSalesOptionDto>>> GetSalesOptionsAsync(int customerId)
    {
        if (customerId <= 0)
            return ServiceResult<List<HutangPiutangSalesOptionDto>>.Failure("Pelanggan tidak valid.");
        try
        {
            return ServiceResult<List<HutangPiutangSalesOptionDto>>.Success(
                await _repository.GetSalesOptionsAsync(customerId));
        }
        catch (Exception)
        {
            return ServiceResult<List<HutangPiutangSalesOptionDto>>.Failure(
                "Gagal memuat transaksi penjualan.");
        }
    }

    public async Task<ServiceResult<HutangPiutangMutationResponseDto>> CreateAsync(
        CreateHutangPiutangRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<HutangPiutangMutationResponseDto>.Failure(err);
        request.Status = ResolveStatus(request.Amount, request.PaidAmount, request.Status);
        try
        {
            return ServiceResult<HutangPiutangMutationResponseDto>.Success(
                await _repository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<HutangPiutangMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<HutangPiutangMutationResponseDto>.Failure(
                "Gagal menyimpan hutang/piutang.");
        }
    }

    public async Task<ServiceResult<HutangPiutangMutationResponseDto>> UpdateAsync(
        long id, UpdateHutangPiutangRequestDto request)
    {
        if (id <= 0)
            return ServiceResult<HutangPiutangMutationResponseDto>.Failure("ID tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<HutangPiutangMutationResponseDto>.Failure(err);
        request.Status = ResolveStatus(request.Amount, request.PaidAmount, request.Status);
        try
        {
            return ServiceResult<HutangPiutangMutationResponseDto>.Success(
                await _repository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<HutangPiutangMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<HutangPiutangMutationResponseDto>.Failure(
                "Gagal memperbarui hutang/piutang.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(long id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID tidak valid.");
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
            return ServiceResult<bool>.Failure("Gagal menghapus hutang/piutang.");
        }
    }

    private static string? Validate(CreateHutangPiutangRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ReferenceNumber))
            return "Nomor referensi wajib diisi.";
        if (request.ReferenceNumber.Trim().Length > 50)
            return "Nomor referensi maksimal 50 karakter.";
        if (request.CustomerId <= 0)
            return "Pelanggan wajib dipilih.";
        if (string.IsNullOrWhiteSpace(request.Type))
            return "Tipe wajib dipilih.";
        if (!AllowedTypes.Contains(request.Type.Trim().ToUpperInvariant()))
            return "Tipe harus PIUTANG atau HUTANG.";
        if (request.Amount <= 0)
            return "Jumlah nominal harus lebih dari 0.";
        if (request.PaidAmount < 0)
            return "Jumlah terbayar tidak boleh negatif.";
        if (request.PaidAmount > request.Amount)
            return "Jumlah terbayar tidak boleh melebihi nominal.";
        if (request.RecordDate == default)
            return "Tanggal catatan wajib diisi.";
        if (request.DueDate.HasValue && request.DueDate.Value < request.RecordDate.Date)
            return "Jatuh tempo tidak boleh sebelum tanggal catatan.";
        if (!string.IsNullOrWhiteSpace(request.Status)
            && !AllowedStatuses.Contains(request.Status.Trim().ToUpperInvariant()))
            return "Status tidak valid.";
        if (request.Description?.Length > 255)
            return "Deskripsi maksimal 255 karakter.";
        if (request.Notes?.Length > 255)
            return "Catatan maksimal 255 karakter.";
        return null;
    }

    private static string ResolveStatus(decimal amount, decimal paid, string status)
    {
        var normalized = string.IsNullOrWhiteSpace(status)
            ? "OPEN"
            : status.Trim().ToUpperInvariant();
        if (normalized == "CANCELLED") return normalized;
        if (paid <= 0) return "OPEN";
        if (paid >= amount) return "PAID";
        return "PARTIAL";
    }
}
