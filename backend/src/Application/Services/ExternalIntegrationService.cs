using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class ExternalIntegrationService : IExternalIntegrationService
{
    private static readonly HashSet<string> ValidTypes =
        ["Accounting", "Marketplace", "Messaging", "ECommerce", "Webhook"];
    private static readonly HashSet<string> ValidDirections =
        ["Inbound", "Outbound", "Bidirectional"];

    private static readonly Dictionary<string, HashSet<string>> ValidProviders = new()
    {
        ["Accounting"] = ["Jurnal", "Accurate", "Zahir", "MyOB"],
        ["Marketplace"] = ["Shopee", "Tokopedia", "Lazada", "Bukalapak"],
        ["Messaging"] = ["WhatsApp", "SMS", "Telegram"],
        ["ECommerce"] = ["WooCommerce", "Shopify", "PrestaShop"],
        ["Webhook"] = ["Custom"],
    };

    private readonly IExternalIntegrationRepository _repository;

    public ExternalIntegrationService(IExternalIntegrationRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<ExternalIntegrationListResponseDto>> GetListAsync(
        string? search, bool? isActive, string? integrationType, string? provider, int? outletId)
    {
        try
        {
            return ServiceResult<ExternalIntegrationListResponseDto>.Success(
                await _repository.GetListAsync(search, isActive, integrationType, provider, outletId));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ExternalIntegrationListResponseDto>.Failure(
                "Tabel ExternalIntegrations belum ada. Jalankan database/pos/integration-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ExternalIntegrationListResponseDto>.Failure(
                "Gagal memuat daftar integrasi.");
        }
    }

    public async Task<ServiceResult<ExternalIntegrationDetailDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<ExternalIntegrationDetailDto>.Failure("ID integrasi tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<ExternalIntegrationDetailDto>.Failure("Integrasi tidak ditemukan.")
                : ServiceResult<ExternalIntegrationDetailDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ExternalIntegrationDetailDto>.Failure(
                "Tabel ExternalIntegrations belum ada. Jalankan database/pos/integration-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ExternalIntegrationDetailDto>.Failure(
                "Gagal memuat detail integrasi.");
        }
    }

    public async Task<ServiceResult<ExternalIntegrationMutationResponseDto>> CreateAsync(
        CreateExternalIntegrationRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<ExternalIntegrationMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<ExternalIntegrationMutationResponseDto>.Success(
                await _repository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<ExternalIntegrationMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<ExternalIntegrationMutationResponseDto>.Failure(
                "Tabel ExternalIntegrations belum ada. Jalankan database/pos/integration-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<ExternalIntegrationMutationResponseDto>.Failure(
                "Gagal menyimpan integrasi.");
        }
    }

    public async Task<ServiceResult<ExternalIntegrationMutationResponseDto>> UpdateAsync(
        int id, UpdateExternalIntegrationRequestDto request)
    {
        if (id <= 0) return ServiceResult<ExternalIntegrationMutationResponseDto>.Failure("ID integrasi tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<ExternalIntegrationMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<ExternalIntegrationMutationResponseDto>.Success(
                await _repository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<ExternalIntegrationMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<ExternalIntegrationMutationResponseDto>.Failure(
                "Gagal memperbarui integrasi.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID integrasi tidak valid.");
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
            return ServiceResult<bool>.Failure("Gagal menghapus integrasi.");
        }
    }

    private static string? Validate(CreateExternalIntegrationRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.IntegrationName))
            return "Nama integrasi wajib diisi.";
        if (request.IntegrationName.Trim().Length > 100)
            return "Nama integrasi maksimal 100 karakter.";

        var type = request.IntegrationType.Trim();
        if (!ValidTypes.Contains(type))
            return "Tipe integrasi tidak valid.";

        var provider = request.Provider.Trim();
        if (string.IsNullOrWhiteSpace(provider))
            return "Provider wajib diisi.";
        if (!ValidProviders.TryGetValue(type, out var providers) || !providers.Contains(provider))
            return $"Provider tidak valid untuk tipe {type}.";

        var direction = request.SyncDirection.Trim();
        if (!ValidDirections.Contains(direction))
            return "Arah sinkronisasi harus Inbound, Outbound, atau Bidirectional.";

        if (request.ApiKey?.Length > 255)
            return "API Key maksimal 255 karakter.";
        if (request.ApiSecret?.Length > 255)
            return "API Secret maksimal 255 karakter.";
        if (request.WebhookUrl?.Length > 500)
            return "Webhook URL maksimal 500 karakter.";
        if (request.BaseUrl?.Length > 500)
            return "Base URL maksimal 500 karakter.";
        if (request.Notes?.Length > 500)
            return "Catatan maksimal 500 karakter.";

        return null;
    }
}
