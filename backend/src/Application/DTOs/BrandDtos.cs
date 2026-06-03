namespace LatihanASP.Application.DTOs;

public class BrandListResponseDto
{
    public List<BrandListItemDto> Brands { get; set; } = [];
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
}

public class BrandListItemDto
{
    public int Id { get; set; }
    public string BrandName { get; set; } = "";
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public int ProductCount { get; set; }
}

public class CreateBrandRequestDto
{
    public string BrandName { get; set; } = "";
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateBrandRequestDto : CreateBrandRequestDto
{
}

public class BrandMutationResponseDto
{
    public int Id { get; set; }
    public string BrandName { get; set; } = "";
}
