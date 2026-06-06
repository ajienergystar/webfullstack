using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class PaymentGatewayService : IPaymentGatewayService
{
    private static readonly HashSet<string> ValidProviders =
        ["Midtrans", "Xendit", "Doku", "Stripe", "Manual"];
    private static readonly HashSet<string> ValidEnvironments = ["Sandbox", "Production"];
    private static readonly HashSet<string> ValidMethods =
        ["Cash", "QRIS", "Transfer", "Debit", "Credit"];

    private readonly IPaymentGatewayRepository _repository;

    public PaymentGatewayService(IPaymentGatewayRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<PaymentGatewayListResponseDto>> GetListAsync(
        string? search, bool? isActive, string? provider, int? outletId)
    {
        try
        {
            return ServiceResult<PaymentGatewayListResponseDto>.Success(
                await _repository.GetListAsync(search, isActive, provider, outletId));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<PaymentGatewayListResponseDto>.Failure(
                "Tabel PaymentGateways belum ada. Jalankan database/pos/payment-gateway-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<PaymentGatewayListResponseDto>.Failure(
                "Gagal memuat daftar payment gateway.");
        }
    }

    public async Task<ServiceResult<PaymentGatewayDetailDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<PaymentGatewayDetailDto>.Failure("ID gateway tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<PaymentGatewayDetailDto>.Failure("Payment gateway tidak ditemukan.")
                : ServiceResult<PaymentGatewayDetailDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<PaymentGatewayDetailDto>.Failure(
                "Tabel PaymentGateways belum ada. Jalankan database/pos/payment-gateway-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<PaymentGatewayDetailDto>.Failure(
                "Gagal memuat detail payment gateway.");
        }
    }

    public async Task<ServiceResult<PaymentGatewayMutationResponseDto>> CreateAsync(
        CreatePaymentGatewayRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<PaymentGatewayMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<PaymentGatewayMutationResponseDto>.Success(
                await _repository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<PaymentGatewayMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<PaymentGatewayMutationResponseDto>.Failure(
                "Tabel PaymentGateways belum ada. Jalankan database/pos/payment-gateway-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<PaymentGatewayMutationResponseDto>.Failure(
                "Gagal menyimpan payment gateway.");
        }
    }

    public async Task<ServiceResult<PaymentGatewayMutationResponseDto>> UpdateAsync(
        int id, UpdatePaymentGatewayRequestDto request)
    {
        if (id <= 0) return ServiceResult<PaymentGatewayMutationResponseDto>.Failure("ID gateway tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<PaymentGatewayMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<PaymentGatewayMutationResponseDto>.Success(
                await _repository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<PaymentGatewayMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<PaymentGatewayMutationResponseDto>.Failure(
                "Gagal memperbarui payment gateway.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID gateway tidak valid.");
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
            return ServiceResult<bool>.Failure("Gagal menghapus payment gateway.");
        }
    }

    private static string? Validate(CreatePaymentGatewayRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.GatewayName))
            return "Nama gateway wajib diisi.";
        if (request.GatewayName.Trim().Length > 100)
            return "Nama gateway maksimal 100 karakter.";

        var provider = request.Provider.Trim();
        if (!ValidProviders.Contains(provider))
            return "Provider harus Midtrans, Xendit, Doku, Stripe, atau Manual.";

        var environment = request.Environment.Trim();
        if (!ValidEnvironments.Contains(environment))
            return "Environment harus Sandbox atau Production.";

        if (request.MerchantId?.Length > 100)
            return "Merchant ID maksimal 100 karakter.";
        if (request.ClientKey?.Length > 255)
            return "Client Key maksimal 255 karakter.";
        if (request.ServerKey?.Length > 255)
            return "Server Key maksimal 255 karakter.";
        if (request.CallbackUrl?.Length > 500)
            return "Callback URL maksimal 500 karakter.";

        if (!string.IsNullOrWhiteSpace(request.SupportedMethods))
        {
            var methods = request.SupportedMethods
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (methods.Any(m => !ValidMethods.Contains(m)))
                return "Metode pembayaran tidak valid. Gunakan: Cash, QRIS, Transfer, Debit, Credit.";
        }

        return null;
    }
}
