using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class SystemSettingsService : ISystemSettingsService
{
    private static readonly HashSet<string> AllowedCurrencies = ["IDR", "USD", "SGD", "MYR"];
    private static readonly HashSet<string> AllowedTimezones =
        ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC"];
    private static readonly HashSet<string> AllowedDateFormats =
        ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

    private readonly ISystemSettingsRepository _repository;

    public SystemSettingsService(ISystemSettingsRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<SystemSettingsDto>> GetAsync()
    {
        try
        {
            var data = await _repository.GetAsync();
            return data is null
                ? ServiceResult<SystemSettingsDto>.Failure("Pengaturan umum belum dikonfigurasi.")
                : ServiceResult<SystemSettingsDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<SystemSettingsDto>.Failure(
                "Tabel SystemSettings belum ada. Jalankan database/pos/system-settings-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<SystemSettingsDto>.Failure("Gagal memuat pengaturan umum.");
        }
    }

    public async Task<ServiceResult<SystemSettingsDto>> UpdateAsync(UpdateSystemSettingsRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<SystemSettingsDto>.Failure(err);

        try
        {
            var result = await _repository.UpdateAsync(request, null);
            return ServiceResult<SystemSettingsDto>.Success(result);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<SystemSettingsDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<SystemSettingsDto>.Failure(
                "Tabel SystemSettings belum ada. Jalankan database/pos/system-settings-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<SystemSettingsDto>.Failure("Gagal menyimpan pengaturan umum.");
        }
    }

    private static string? Validate(UpdateSystemSettingsRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.CompanyName))
            return "Nama perusahaan wajib diisi.";
        if (request.CompanyName.Trim().Length > 150)
            return "Nama perusahaan maksimal 150 karakter.";
        if (!string.IsNullOrWhiteSpace(request.Tagline) && request.Tagline.Trim().Length > 255)
            return "Tagline maksimal 255 karakter.";
        if (!string.IsNullOrWhiteSpace(request.Address) && request.Address.Trim().Length > 500)
            return "Alamat maksimal 500 karakter.";
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber) && request.PhoneNumber.Trim().Length > 20)
            return "Nomor telepon maksimal 20 karakter.";
        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email.Trim().Length > 100)
            return "Email maksimal 100 karakter.";
        if (!string.IsNullOrWhiteSpace(request.Website) && request.Website.Trim().Length > 150)
            return "Website maksimal 150 karakter.";
        if (!string.IsNullOrWhiteSpace(request.TaxId) && request.TaxId.Trim().Length > 50)
            return "NPWP maksimal 50 karakter.";

        var currency = request.CurrencyCode.Trim().ToUpperInvariant();
        if (!AllowedCurrencies.Contains(currency))
            return "Kode mata uang tidak valid.";

        if (string.IsNullOrWhiteSpace(request.CurrencySymbol) || request.CurrencySymbol.Trim().Length > 10)
            return "Simbol mata uang wajib diisi (maks. 10 karakter).";

        if (!AllowedTimezones.Contains(request.Timezone.Trim()))
            return "Zona waktu tidak valid.";

        if (!AllowedDateFormats.Contains(request.DateFormat.Trim()))
            return "Format tanggal tidak valid.";

        if (string.IsNullOrWhiteSpace(request.InvoicePrefix))
            return "Prefix invoice wajib diisi.";
        if (request.InvoicePrefix.Trim().Length > 10)
            return "Prefix invoice maksimal 10 karakter.";

        if (request.LowStockThreshold < 0 || request.LowStockThreshold > 9999)
            return "Batas stok menipis harus antara 0 dan 9999.";

        return null;
    }
}
