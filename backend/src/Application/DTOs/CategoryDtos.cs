namespace LatihanASP.Application.DTOs;

public class CategoryListResponseDto
{
    public List<CategoryListItemDto> Categories { get; set; } = [];
    public int TotalCount { get; set; }
}

public class CategoryListItemDto
{
    public int Id { get; set; }
    public string CategoryName { get; set; } = "";
    public int ProductCount { get; set; }
}

public class CreateCategoryRequestDto
{
    public string CategoryName { get; set; } = "";
}

public class UpdateCategoryRequestDto
{
    public string CategoryName { get; set; } = "";
}

public class CategoryMutationResponseDto
{
    public int Id { get; set; }
    public string CategoryName { get; set; } = "";
}
