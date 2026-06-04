using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class TaxService : ITaxService
{
    private static readonly HashSet<string> AllowedTypes =
        ["PPN", "SERVICE_CHARGE", "OTHER"];

    private readonly ITaxRepository _repository;

    public TaxService(ITaxRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<TaxListResponseDto>> GetListAsync(
        string? search, string? taxType, bool? isActive)
    {
        try
        {
            return ServiceResult<TaxListResponseDto>.Success(
                await _repository.GetListAsync(search, taxType, isActive));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<TaxListResponseDto>.Failure(
                "Tabel Taxes belum ada. Jalankan database/pos/tax-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<TaxListResponseDto>.Failure("Gagal memuat daftar pajak.");
        }
    }

    public async Task<ServiceResult<TaxListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<TaxListItemDto>.Failure("ID pajak tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<TaxListItemDto>.Failure("Data pajak tidak ditemukan.")
                : ServiceResult<TaxListItemDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<TaxListItemDto>.Failure(
                "Tabel Taxes belum ada. Jalankan database/pos/tax-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<TaxListItemDto>.Failure("Gagal memuat detail pajak.");
        }
    }

    public async Task<ServiceResult<TaxMutationResponseDto>> CreateAsync(CreateTaxRequestDto request)
    {
        var err = Validate(request.TaxCode, request.TaxName, request.TaxType, request.TaxRate);
        if (err is not null) return ServiceResult<TaxMutationResponseDto>.Failure(err);

        try
        {
            var id = await _repository.CreateAsync(request);
            return ServiceResult<TaxMutationResponseDto>.Success(new TaxMutationResponseDto
            {
                Id = id,
                TaxName = request.TaxName.Trim()
            });
        }
        catch (Exception ex) when (ex.Message.Contains("Violation of UNIQUE KEY") || ex.Message.Contains("duplicate key"))
        {
            return ServiceResult<TaxMutationResponseDto>.Failure("Kode pajak sudah digunakan.");
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<TaxMutationResponseDto>.Failure(
                "Tabel Taxes belum ada. Jalankan database/pos/tax-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<TaxMutationResponseDto>.Failure("Gagal menyimpan data pajak.");
        }
    }

    public async Task<ServiceResult<TaxMutationResponseDto>> UpdateAsync(int id, UpdateTaxRequestDto request)
    {
        if (id <= 0) return ServiceResult<TaxMutationResponseDto>.Failure("ID pajak tidak valid.");

        var err = Validate(request.TaxCode, request.TaxName, request.TaxType, request.TaxRate);
        if (err is not null) return ServiceResult<TaxMutationResponseDto>.Failure(err);

        try
        {
            await _repository.UpdateAsync(id, request);
            return ServiceResult<TaxMutationResponseDto>.Success(new TaxMutationResponseDto
            {
                Id = id,
                TaxName = request.TaxName.Trim()
            });
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<TaxMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Violation of UNIQUE KEY") || ex.Message.Contains("duplicate key"))
        {
            return ServiceResult<TaxMutationResponseDto>.Failure("Kode pajak sudah digunakan.");
        }
        catch (Exception)
        {
            return ServiceResult<TaxMutationResponseDto>.Failure("Gagal memperbarui data pajak.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID pajak tidak valid.");
        try
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing is null)
                return ServiceResult<bool>.Failure("Data pajak tidak ditemukan.");
            if (existing.IsDefault)
                return ServiceResult<bool>.Failure("Pajak default tidak dapat dihapus. Set pajak lain sebagai default terlebih dahulu.");

            await _repository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus data pajak.");
        }
    }

    private static string? Validate(string taxCode, string taxName, string taxType, decimal taxRate)
    {
        if (string.IsNullOrWhiteSpace(taxCode))
            return "Kode pajak wajib diisi.";
        if (taxCode.Trim().Length > 20)
            return "Kode pajak maksimal 20 karakter.";
        if (string.IsNullOrWhiteSpace(taxName))
            return "Nama pajak wajib diisi.";
        if (taxName.Trim().Length > 100)
            return "Nama pajak maksimal 100 karakter.";
        if (string.IsNullOrWhiteSpace(taxType) || !AllowedTypes.Contains(taxType.Trim().ToUpperInvariant()))
            return "Jenis pajak tidak valid.";
        if (taxRate < 0 || taxRate > 100)
            return "Tarif pajak harus antara 0 dan 100.";
        return null;
    }
}
