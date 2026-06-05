namespace LatihanASP.Application.DTOs;

public class ProductDiscountListItemDto
{
    public int Id { get; set; }
    public string DiscountName { get; set; } = "";
    public string DiscountType { get; set; } = "";
    public decimal DiscountValue { get; set; }
    public decimal? MinPurchaseAmount { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? OutletId { get; set; }
    public string? OutletName { get; set; }
    public bool IsActive { get; set; }
    public string? Description { get; set; }
    public int ProductCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductDiscountListResponseDto
{
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
    public List<ProductDiscountListItemDto> Discounts { get; set; } = [];
}

public class ProductDiscountProductDto
{
    public int ProductId { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Unit { get; set; }
    public decimal SellingPrice { get; set; }
}

public class ProductDiscountDetailDto : ProductDiscountListItemDto
{
    public List<ProductDiscountProductDto> Products { get; set; } = [];
}

public class ProductDiscountProductOptionDto
{
    public int Id { get; set; }
    public string ProductCode { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? CategoryName { get; set; }
    public decimal SellingPrice { get; set; }
    public string? Unit { get; set; }
}

public class ProductDiscountOutletOptionDto
{
    public int Id { get; set; }
    public string OutletName { get; set; } = "";
}

public class ProductDiscountFormDataDto
{
    public List<ProductDiscountProductOptionDto> Products { get; set; } = [];
    public List<ProductDiscountOutletOptionDto> Outlets { get; set; } = [];
}

public class CreateProductDiscountRequestDto
{
    public string DiscountName { get; set; } = "";
    public string DiscountType { get; set; } = "";
    public decimal DiscountValue { get; set; }
    public decimal? MinPurchaseAmount { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? OutletId { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
    public List<int> ProductIds { get; set; } = [];
}

public class UpdateProductDiscountRequestDto : CreateProductDiscountRequestDto
{
}

public class ProductDiscountMutationResponseDto
{
    public int Id { get; set; }
    public string DiscountName { get; set; } = "";
}
