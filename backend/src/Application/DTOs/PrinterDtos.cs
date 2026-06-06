namespace LatihanASP.Application.DTOs;

public class PrinterListResponseDto
{
    public List<PrinterListItemDto> Printers { get; set; } = [];
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
    public int DefaultCount { get; set; }
}

public class PrinterListItemDto
{
    public int Id { get; set; }
    public string PrinterName { get; set; } = "";
    public string ConnectionType { get; set; } = "";
    public string? IpAddress { get; set; }
    public string? Port { get; set; }
    public int PaperWidthMm { get; set; }
    public string PrinterPurpose { get; set; } = "";
    public int? OutletId { get; set; }
    public string? OutletName { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class CreatePrinterRequestDto
{
    public string PrinterName { get; set; } = "";
    public string ConnectionType { get; set; } = "USB";
    public string? IpAddress { get; set; }
    public string? Port { get; set; }
    public int PaperWidthMm { get; set; } = 58;
    public string PrinterPurpose { get; set; } = "Receipt";
    public int? OutletId { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdatePrinterRequestDto : CreatePrinterRequestDto
{
}

public class PrinterMutationResponseDto
{
    public int Id { get; set; }
    public string PrinterName { get; set; } = "";
}
