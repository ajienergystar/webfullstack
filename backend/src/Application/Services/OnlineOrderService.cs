using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class OnlineOrderService : IOnlineOrderService
{
    private static readonly HashSet<string> ValidOrderStatuses =
        ["PENDING", "CONFIRMED", "PROCESSING", "READY", "COMPLETED", "CANCELLED"];

    private static readonly HashSet<string> ValidPaymentStatuses =
        ["UNPAID", "PAID", "REFUNDED"];

    private static readonly HashSet<string> AllowedPaymentMethods =
        ["Cash", "QRIS", "Transfer", "Debit", "Credit"];

    private static readonly Dictionary<string, HashSet<string>> AllowedTransitions = new()
    {
        ["PENDING"] = ["CONFIRMED", "CANCELLED"],
        ["CONFIRMED"] = ["PROCESSING", "CANCELLED"],
        ["PROCESSING"] = ["READY", "CANCELLED"],
        ["READY"] = ["COMPLETED", "CANCELLED"],
    };

    private readonly IOnlineOrderRepository _repository;

    public OnlineOrderService(IOnlineOrderRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<OnlineOrderListResponseDto>> GetListAsync(
        string? search,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? orderStatus,
        string? paymentStatus,
        string? orderSource,
        int? outletId)
    {
        if (orderStatus is not null && !ValidOrderStatuses.Contains(orderStatus))
            return ServiceResult<OnlineOrderListResponseDto>.Failure("Status pesanan tidak valid.");
        if (paymentStatus is not null && !ValidPaymentStatuses.Contains(paymentStatus))
            return ServiceResult<OnlineOrderListResponseDto>.Failure("Status pembayaran tidak valid.");

        try
        {
            return ServiceResult<OnlineOrderListResponseDto>.Success(
                await _repository.GetListAsync(search, dateFrom, dateTo, orderStatus, paymentStatus, orderSource, outletId));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<OnlineOrderListResponseDto>.Failure(
                "Tabel OnlineOrders belum ada. Jalankan database/pos/online-order-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<OnlineOrderListResponseDto>.Failure("Gagal memuat daftar pesanan online.");
        }
    }

    public async Task<ServiceResult<OnlineOrderDetailDto>> GetByIdAsync(long id)
    {
        if (id <= 0) return ServiceResult<OnlineOrderDetailDto>.Failure("ID pesanan tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<OnlineOrderDetailDto>.Failure("Pesanan online tidak ditemukan.")
                : ServiceResult<OnlineOrderDetailDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<OnlineOrderDetailDto>.Failure(
                "Tabel OnlineOrders belum ada. Jalankan database/pos/online-order-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<OnlineOrderDetailDto>.Failure("Gagal memuat detail pesanan.");
        }
    }

    public async Task<ServiceResult<bool>> UpdateStatusAsync(long id, UpdateOnlineOrderStatusRequestDto request)
    {
        if (!ValidOrderStatuses.Contains(request.OrderStatus))
            return ServiceResult<bool>.Failure("Status pesanan tidak valid.");

        try
        {
            var current = await _repository.GetByIdAsync(id);
            if (current is null)
                return ServiceResult<bool>.Failure("Pesanan online tidak ditemukan.");

            if (current.OrderStatus is "COMPLETED" or "CANCELLED")
                return ServiceResult<bool>.Failure("Pesanan sudah selesai atau dibatalkan.");

            if (request.OrderStatus == "COMPLETED")
                return ServiceResult<bool>.Failure("Gunakan endpoint complete untuk menyelesaikan pesanan.");

            if (AllowedTransitions.TryGetValue(current.OrderStatus, out var next)
                && !next.Contains(request.OrderStatus))
            {
                return ServiceResult<bool>.Failure(
                    $"Tidak dapat mengubah status dari {current.OrderStatus} ke {request.OrderStatus}.");
            }

            await _repository.UpdateStatusAsync(id, request);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<bool>.Failure(
                "Tabel OnlineOrders belum ada. Jalankan database/pos/online-order-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal memperbarui status pesanan.");
        }
    }

    public async Task<ServiceResult<CompleteOnlineOrderResponseDto>> CompleteAsync(
        long id, CompleteOnlineOrderRequestDto request)
    {
        if (request.UserId <= 0) return ServiceResult<CompleteOnlineOrderResponseDto>.Failure("Kasir wajib dipilih.");
        if (!AllowedPaymentMethods.Contains(request.PaymentMethod))
            return ServiceResult<CompleteOnlineOrderResponseDto>.Failure("Metode pembayaran tidak valid.");

        try
        {
            var result = await _repository.CompleteAsync(id, request);
            return ServiceResult<CompleteOnlineOrderResponseDto>.Success(result);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<CompleteOnlineOrderResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<CompleteOnlineOrderResponseDto>.Failure(
                "Tabel OnlineOrders belum ada. Jalankan database/pos/online-order-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<CompleteOnlineOrderResponseDto>.Failure("Gagal menyelesaikan pesanan online.");
        }
    }
}
