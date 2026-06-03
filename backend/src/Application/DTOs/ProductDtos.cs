namespace LatihanASP.Application.DTOs;

public class ProductFormDataDto
{
    public List<ProductCategoryDto> Categories { get; set; } = [];
    public List<ProductBrandDto> Brands { get; set; } = [];
}

public class ProductCategoryDto
{
    public int Id { get; set; }
    public string CategoryName { get; set; } = "";
}

public class ProductBrandDto
{
    public int Id { get; set; }
    public string BrandName { get; set; } = "";
}

public class ProductListResponseDto
{
    public List<ProductListItemDto> Products { get; set; } = [];
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
}

public class ProductListItemDto
{
    public int Id { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int? BrandId { get; set; }
    public string? BrandName { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Barcode { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal SellingPrice { get; set; }
    public int Stock { get; set; }
    public string? Unit { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateProductRequestDto
{
    public int? CategoryId { get; set; }
    public int? BrandId { get; set; }
    public string? ProductCode { get; set; }
    public string ProductName { get; set; } = "";
    public string? Barcode { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal SellingPrice { get; set; }
    public int Stock { get; set; }
    public string? Unit { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateProductRequestDto : CreateProductRequestDto
{
}

public class ProductMutationResponseDto
{
    public int Id { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
}
