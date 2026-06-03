namespace LatihanASP.Application.DTOs;

public class SupplierListResponseDto
{
    public List<SupplierListItemDto> Suppliers { get; set; } = [];
    public int TotalCount { get; set; }
}

public class SupplierListItemDto
{
    public int Id { get; set; }
    public string SupplierName { get; set; } = "";
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public int PurchaseCount { get; set; }
}

public class CreateSupplierRequestDto
{
    public string SupplierName { get; set; } = "";
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
}

public class UpdateSupplierRequestDto : CreateSupplierRequestDto
{
}

public class SupplierMutationResponseDto
{
    public int Id { get; set; }
    public string SupplierName { get; set; } = "";
}
