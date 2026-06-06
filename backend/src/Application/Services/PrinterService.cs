using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class PrinterService : IPrinterService
{
    private static readonly HashSet<string> ValidConnectionTypes = ["USB", "Bluetooth", "Network"];
    private static readonly HashSet<int> ValidPaperWidths = [58, 80];
    private static readonly HashSet<string> ValidPurposes = ["Receipt", "Kitchen", "Label"];

    private readonly IPrinterRepository _printerRepository;

    public PrinterService(IPrinterRepository printerRepository)
    {
        _printerRepository = printerRepository;
    }

    public async Task<ServiceResult<PrinterListResponseDto>> GetListAsync(
        string? search, bool? isActive, string? connectionType, int? outletId)
    {
        try
        {
            return ServiceResult<PrinterListResponseDto>.Success(
                await _printerRepository.GetListAsync(search, isActive, connectionType, outletId));
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<PrinterListResponseDto>.Failure(
                "Tabel Printers belum ada. Jalankan database/pos/printer-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<PrinterListResponseDto>.Failure("Gagal memuat daftar printer.");
        }
    }

    public async Task<ServiceResult<PrinterListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<PrinterListItemDto>.Failure("ID printer tidak valid.");
        try
        {
            var data = await _printerRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<PrinterListItemDto>.Failure("Printer tidak ditemukan.")
                : ServiceResult<PrinterListItemDto>.Success(data);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<PrinterListItemDto>.Failure(
                "Tabel Printers belum ada. Jalankan database/pos/printer-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<PrinterListItemDto>.Failure("Gagal memuat detail printer.");
        }
    }

    public async Task<ServiceResult<PrinterMutationResponseDto>> CreateAsync(CreatePrinterRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<PrinterMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<PrinterMutationResponseDto>.Success(
                await _printerRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<PrinterMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception ex) when (ex.Message.Contains("Invalid object name"))
        {
            return ServiceResult<PrinterMutationResponseDto>.Failure(
                "Tabel Printers belum ada. Jalankan database/pos/printer-tables.sql.");
        }
        catch (Exception)
        {
            return ServiceResult<PrinterMutationResponseDto>.Failure("Gagal menyimpan printer.");
        }
    }

    public async Task<ServiceResult<PrinterMutationResponseDto>> UpdateAsync(
        int id, UpdatePrinterRequestDto request)
    {
        if (id <= 0) return ServiceResult<PrinterMutationResponseDto>.Failure("ID printer tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<PrinterMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<PrinterMutationResponseDto>.Success(
                await _printerRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<PrinterMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<PrinterMutationResponseDto>.Failure("Gagal memperbarui printer.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID printer tidak valid.");
        try
        {
            await _printerRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus printer.");
        }
    }

    private static string? Validate(CreatePrinterRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.PrinterName))
            return "Nama printer wajib diisi.";
        if (request.PrinterName.Trim().Length > 100)
            return "Nama printer maksimal 100 karakter.";

        var connectionType = request.ConnectionType.Trim();
        if (!ValidConnectionTypes.Contains(connectionType))
            return "Tipe koneksi harus USB, Bluetooth, atau Network.";

        if (connectionType == "Network")
        {
            if (string.IsNullOrWhiteSpace(request.IpAddress))
                return "Alamat IP wajib diisi untuk printer Network.";
            if (request.IpAddress.Trim().Length > 45)
                return "Alamat IP maksimal 45 karakter.";
        }

        if (request.Port?.Length > 10)
            return "Port maksimal 10 karakter.";

        if (!ValidPaperWidths.Contains(request.PaperWidthMm))
            return "Lebar kertas harus 58mm atau 80mm.";

        var purpose = request.PrinterPurpose.Trim();
        if (!ValidPurposes.Contains(purpose))
            return "Fungsi printer harus Receipt, Kitchen, atau Label.";

        return null;
    }
}
