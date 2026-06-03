using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class StockService : IStockService
{
    private static readonly HashSet<string> AllowedMovementTypes = ["IN", "OUT"];

    private readonly IStockRepository _stockRepository;

    public StockService(IStockRepository stockRepository)
    {
        _stockRepository = stockRepository;
    }

    public async Task<ServiceResult<StockOverviewResponseDto>> GetOverviewAsync(
        string? search, bool lowStockOnly)
    {
        try
        {
            return ServiceResult<StockOverviewResponseDto>.Success(
                await _stockRepository.GetOverviewAsync(search, lowStockOnly));
        }
        catch (Exception)
        {
            return ServiceResult<StockOverviewResponseDto>.Failure("Gagal memuat data stok produk.");
        }
    }

    public async Task<ServiceResult<StockMovementListResponseDto>> GetMovementsAsync(
        string? search, string? movementType, int? productId)
    {
        try
        {
            return ServiceResult<StockMovementListResponseDto>.Success(
                await _stockRepository.GetMovementsAsync(search, movementType, productId));
        }
        catch (Exception)
        {
            return ServiceResult<StockMovementListResponseDto>.Failure("Gagal memuat riwayat pergerakan stok.");
        }
    }

    public async Task<ServiceResult<StockFormDataDto>> GetFormDataAsync()
    {
        try
        {
            return ServiceResult<StockFormDataDto>.Success(await _stockRepository.GetFormDataAsync());
        }
        catch (Exception)
        {
            return ServiceResult<StockFormDataDto>.Failure("Gagal memuat data form stok.");
        }
    }

    public async Task<ServiceResult<StockAdjustmentResponseDto>> AdjustStockAsync(
        CreateStockAdjustmentRequestDto request)
    {
        var err = ValidateAdjustment(request);
        if (err is not null) return ServiceResult<StockAdjustmentResponseDto>.Failure(err);
        try
        {
            return ServiceResult<StockAdjustmentResponseDto>.Success(
                await _stockRepository.AdjustStockAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<StockAdjustmentResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<StockAdjustmentResponseDto>.Failure("Gagal menyimpan penyesuaian stok.");
        }
    }

    private static string? ValidateAdjustment(CreateStockAdjustmentRequestDto request)
    {
        if (request.ProductId <= 0) return "Produk wajib dipilih.";
        if (request.Qty <= 0) return "Qty harus lebih dari 0.";
        var type = request.MovementType?.Trim().ToUpperInvariant() ?? "";
        if (!AllowedMovementTypes.Contains(type))
            return "Tipe pergerakan harus IN atau OUT.";
        request.MovementType = type;
        return null;
    }
}
