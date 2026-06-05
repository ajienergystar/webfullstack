namespace LatihanASP.Application.DTOs;

public class ProductBundleListItemDto
{
    public int Id { get; set; }
    public string BundleCode { get; set; } = "";
    public string BundleName { get; set; } = "";
    public string? Description { get; set; }
    public decimal BundlePrice { get; set; }
    public decimal NormalPrice { get; set; }
    public decimal Savings { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? OutletId { get; set; }
    public string? OutletName { get; set; }
    public bool IsActive { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductBundleListResponseDto
{
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
    public List<ProductBundleListItemDto> Bundles { get; set; } = [];
}

public class ProductBundleItemDto
{
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Unit { get; set; }
    public decimal SellingPrice { get; set; }
    public int Qty { get; set; }
    public decimal LineTotal { get; set; }
}

public class ProductBundleDetailDto : ProductBundleListItemDto
{
    public List<ProductBundleItemDto> Items { get; set; } = [];
}

public class ProductBundleProductOptionDto
{
    public int Id { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? CategoryName { get; set; }
    public decimal SellingPrice { get; set; }
    public string? Unit { get; set; }
}

public class ProductBundleOutletOptionDto
{
    public int Id { get; set; }
    public string OutletName { get; set; } = "";
}

public class ProductBundleFormDataDto
{
    public List<ProductBundleProductOptionDto> Products { get; set; } = [];
    public List<ProductBundleOutletOptionDto> Outlets { get; set; } = [];
}

public class ProductBundleItemRequestDto
{
    public int ProductId { get; set; }
    public int Qty { get; set; } = 1;
}

public class CreateProductBundleRequestDto
{
    public string BundleCode { get; set; } = "";
    public string BundleName { get; set; } = "";
    public string? Description { get; set; }
    public decimal BundlePrice { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? OutletId { get; set; }
    public bool IsActive { get; set; } = true;
    public List<ProductBundleItemRequestDto> Items { get; set; } = [];
}

public class UpdateProductBundleRequestDto : CreateProductBundleRequestDto
{
}

public class ProductBundleMutationResponseDto
{
    public int Id { get; set; }
    public string BundleCode { get; set; } = "";
    public string BundleName { get; set; } = "";
}
