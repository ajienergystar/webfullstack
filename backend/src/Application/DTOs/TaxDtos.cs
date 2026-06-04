namespace LatihanASP.Application.DTOs;

public class TaxListItemDto
{
    public int Id { get; set; }
    public string TaxCode { get; set; } = "";
    public string TaxName { get; set; } = "";
    public string TaxType { get; set; } = "";
    public decimal TaxRate { get; set; }
    public bool IsInclusive { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TaxListResponseDto
{
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
    public List<TaxListItemDto> Taxes { get; set; } = [];
}

public class CreateTaxRequestDto
{
    public string TaxCode { get; set; } = "";
    public string TaxName { get; set; } = "";
    public string TaxType { get; set; } = "";
    public decimal TaxRate { get; set; }
    public bool IsInclusive { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
}

public class UpdateTaxRequestDto
{
    public string TaxCode { get; set; } = "";
    public string TaxName { get; set; } = "";
    public string TaxType { get; set; } = "";
    public decimal TaxRate { get; set; }
    public bool IsInclusive { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public string? Description { get; set; }
}

public class TaxMutationResponseDto
{
    public int Id { get; set; }
    public string TaxName { get; set; } = "";
}
