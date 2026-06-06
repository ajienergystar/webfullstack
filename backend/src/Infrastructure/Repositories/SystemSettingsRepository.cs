using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class SystemSettingsRepository : ISystemSettingsRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public SystemSettingsRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    private const string SelectColumns = @"
        S.Id, S.CompanyName, S.Tagline, S.Address, S.PhoneNumber, S.Email, S.Website, S.TaxId,
        S.CurrencyCode, S.CurrencySymbol, S.Timezone, S.DateFormat, S.DefaultOutletId,
        O.OutletName, S.InvoicePrefix, S.ReceiptHeader, S.ReceiptFooter, S.LogoUrl,
        S.LowStockThreshold, S.EnableLoyalty, S.EnableTax, S.UpdatedAt, S.UpdatedByUserId,
        U.FullName";

    public async Task<SystemSettingsDto?> GetAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand($@"
            SELECT TOP 1 {SelectColumns}
            FROM SystemSettings S
            LEFT JOIN Outlets O ON O.Id = S.DefaultOutletId
            LEFT JOIN Users U ON U.Id = S.UpdatedByUserId
            ORDER BY S.Id", connection);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return Map(reader);
    }

    public async Task<SystemSettingsDto> UpdateAsync(
        UpdateSystemSettingsRequestDto request, int? updatedByUserId)
    {
        var companyName = request.CompanyName.Trim();
        var tagline = NormalizeOptional(request.Tagline, 255);
        var address = NormalizeOptional(request.Address, 500);
        var phone = NormalizeOptional(request.PhoneNumber, 20);
        var email = NormalizeOptional(request.Email, 100);
        var website = NormalizeOptional(request.Website, 150);
        var taxId = NormalizeOptional(request.TaxId, 50);
        var currencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        var currencySymbol = request.CurrencySymbol.Trim();
        var timezone = request.Timezone.Trim();
        var dateFormat = request.DateFormat.Trim();
        var invoicePrefix = request.InvoicePrefix.Trim().ToUpperInvariant();
        var receiptHeader = NormalizeOptional(request.ReceiptHeader, 255);
        var receiptFooter = NormalizeOptional(request.ReceiptFooter, 255);
        var logoUrl = NormalizeOptional(request.LogoUrl, 500);
        var lowStock = request.LowStockThreshold;

        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (request.DefaultOutletId.HasValue)
        {
            await using var checkOutlet = new SqlCommand(
                "SELECT 1 FROM Outlets WHERE Id = @id", connection);
            checkOutlet.Parameters.AddWithValue("@id", request.DefaultOutletId.Value);
            if (await checkOutlet.ExecuteScalarAsync() is null)
                throw new InvalidOperationException("Outlet default tidak ditemukan.");
        }

        var existingId = await GetExistingIdAsync(connection);

        if (existingId.HasValue)
        {
            await using var cmd = new SqlCommand(@"
                UPDATE SystemSettings SET
                    CompanyName = @companyName, Tagline = @tagline, Address = @address,
                    PhoneNumber = @phone, Email = @email, Website = @website, TaxId = @taxId,
                    CurrencyCode = @currencyCode, CurrencySymbol = @currencySymbol,
                    Timezone = @timezone, DateFormat = @dateFormat, DefaultOutletId = @outletId,
                    InvoicePrefix = @invoicePrefix, ReceiptHeader = @receiptHeader,
                    ReceiptFooter = @receiptFooter, LogoUrl = @logoUrl,
                    LowStockThreshold = @lowStock, EnableLoyalty = @loyalty, EnableTax = @tax,
                    UpdatedAt = SYSUTCDATETIME(), UpdatedByUserId = @userId
                WHERE Id = @id", connection);
            AddUpdateParams(cmd, companyName, tagline, address, phone, email, website, taxId,
                currencyCode, currencySymbol, timezone, dateFormat, request.DefaultOutletId,
                invoicePrefix, receiptHeader, receiptFooter, logoUrl, lowStock,
                request.EnableLoyalty, request.EnableTax, updatedByUserId);
            cmd.Parameters.AddWithValue("@id", existingId.Value);
            await cmd.ExecuteNonQueryAsync();
        }
        else
        {
            await using var cmd = new SqlCommand(@"
                INSERT INTO SystemSettings (
                    CompanyName, Tagline, Address, PhoneNumber, Email, Website, TaxId,
                    CurrencyCode, CurrencySymbol, Timezone, DateFormat, DefaultOutletId,
                    InvoicePrefix, ReceiptHeader, ReceiptFooter, LogoUrl,
                    LowStockThreshold, EnableLoyalty, EnableTax, UpdatedByUserId
                ) VALUES (
                    @companyName, @tagline, @address, @phone, @email, @website, @taxId,
                    @currencyCode, @currencySymbol, @timezone, @dateFormat, @outletId,
                    @invoicePrefix, @receiptHeader, @receiptFooter, @logoUrl,
                    @lowStock, @loyalty, @tax, @userId
                )", connection);
            AddUpdateParams(cmd, companyName, tagline, address, phone, email, website, taxId,
                currencyCode, currencySymbol, timezone, dateFormat, request.DefaultOutletId,
                invoicePrefix, receiptHeader, receiptFooter, logoUrl, lowStock,
                request.EnableLoyalty, request.EnableTax, updatedByUserId);
            await cmd.ExecuteNonQueryAsync();
        }

        return (await GetAsync())!;
    }

    private static async Task<int?> GetExistingIdAsync(SqlConnection connection)
    {
        await using var cmd = new SqlCommand("SELECT TOP 1 Id FROM SystemSettings ORDER BY Id", connection);
        var result = await cmd.ExecuteScalarAsync();
        return result is null or DBNull ? null : Convert.ToInt32(result);
    }

    private static void AddUpdateParams(
        SqlCommand cmd,
        string companyName, string? tagline, string? address, string? phone,
        string? email, string? website, string? taxId,
        string currencyCode, string currencySymbol, string timezone, string dateFormat,
        int? outletId, string invoicePrefix, string? receiptHeader, string? receiptFooter,
        string? logoUrl, int lowStock, bool loyalty, bool tax, int? userId)
    {
        cmd.Parameters.AddWithValue("@companyName", companyName);
        cmd.Parameters.AddWithValue("@tagline", (object?)tagline ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@address", (object?)address ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@phone", (object?)phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@email", (object?)email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@website", (object?)website ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@taxId", (object?)taxId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@currencyCode", currencyCode);
        cmd.Parameters.AddWithValue("@currencySymbol", currencySymbol);
        cmd.Parameters.AddWithValue("@timezone", timezone);
        cmd.Parameters.AddWithValue("@dateFormat", dateFormat);
        cmd.Parameters.AddWithValue("@outletId", outletId.HasValue ? outletId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@invoicePrefix", invoicePrefix);
        cmd.Parameters.AddWithValue("@receiptHeader", (object?)receiptHeader ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@receiptFooter", (object?)receiptFooter ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@logoUrl", (object?)logoUrl ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@lowStock", lowStock);
        cmd.Parameters.AddWithValue("@loyalty", loyalty);
        cmd.Parameters.AddWithValue("@tax", tax);
        cmd.Parameters.AddWithValue("@userId", userId.HasValue ? userId.Value : DBNull.Value);
    }

    private static SystemSettingsDto Map(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        CompanyName = reader.GetString(1),
        Tagline = reader.IsDBNull(2) ? null : reader.GetString(2),
        Address = reader.IsDBNull(3) ? null : reader.GetString(3),
        PhoneNumber = reader.IsDBNull(4) ? null : reader.GetString(4),
        Email = reader.IsDBNull(5) ? null : reader.GetString(5),
        Website = reader.IsDBNull(6) ? null : reader.GetString(6),
        TaxId = reader.IsDBNull(7) ? null : reader.GetString(7),
        CurrencyCode = reader.GetString(8),
        CurrencySymbol = reader.GetString(9),
        Timezone = reader.GetString(10),
        DateFormat = reader.GetString(11),
        DefaultOutletId = reader.IsDBNull(12) ? null : reader.GetInt32(12),
        DefaultOutletName = reader.IsDBNull(13) ? null : reader.GetString(13),
        InvoicePrefix = reader.GetString(14),
        ReceiptHeader = reader.IsDBNull(15) ? null : reader.GetString(15),
        ReceiptFooter = reader.IsDBNull(16) ? null : reader.GetString(16),
        LogoUrl = reader.IsDBNull(17) ? null : reader.GetString(17),
        LowStockThreshold = reader.GetInt32(18),
        EnableLoyalty = reader.GetBoolean(19),
        EnableTax = reader.GetBoolean(20),
        UpdatedAt = reader.IsDBNull(21) ? null : reader.GetDateTime(21),
        UpdatedByUserId = reader.IsDBNull(22) ? null : reader.GetInt32(22),
        UpdatedByUserName = reader.IsDBNull(23) ? null : reader.GetString(23),
    };

    private static string? NormalizeOptional(string? value, int maxLen)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed.Length > maxLen ? trimmed[..maxLen] : trimmed;
    }
}
