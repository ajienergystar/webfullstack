namespace LatihanASP.Application.DTOs;

public class SystemSettingsDto
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = "";
    public string? Tagline { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? TaxId { get; set; }
    public string CurrencyCode { get; set; } = "IDR";
    public string CurrencySymbol { get; set; } = "Rp";
    public string Timezone { get; set; } = "Asia/Jakarta";
    public string DateFormat { get; set; } = "DD/MM/YYYY";
    public int? DefaultOutletId { get; set; }
    public string? DefaultOutletName { get; set; }
    public string InvoicePrefix { get; set; } = "INV";
    public string? ReceiptHeader { get; set; }
    public string? ReceiptFooter { get; set; }
    public string? LogoUrl { get; set; }
    public int LowStockThreshold { get; set; } = 10;
    public bool EnableLoyalty { get; set; } = true;
    public bool EnableTax { get; set; } = true;
    public DateTime? UpdatedAt { get; set; }
    public int? UpdatedByUserId { get; set; }
    public string? UpdatedByUserName { get; set; }
}

public class UpdateSystemSettingsRequestDto
{
    public string CompanyName { get; set; } = "";
    public string? Tagline { get; set; }
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? TaxId { get; set; }
    public string CurrencyCode { get; set; } = "IDR";
    public string CurrencySymbol { get; set; } = "Rp";
    public string Timezone { get; set; } = "Asia/Jakarta";
    public string DateFormat { get; set; } = "DD/MM/YYYY";
    public int? DefaultOutletId { get; set; }
    public string InvoicePrefix { get; set; } = "INV";
    public string? ReceiptHeader { get; set; }
    public string? ReceiptFooter { get; set; }
    public string? LogoUrl { get; set; }
    public int LowStockThreshold { get; set; } = 10;
    public bool EnableLoyalty { get; set; } = true;
    public bool EnableTax { get; set; } = true;
}
