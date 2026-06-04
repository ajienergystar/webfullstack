namespace LatihanASP.Application.DTOs;

public class OutletListResponseDto
{
    public List<OutletListItemDto> Outlets { get; set; } = [];
    public int TotalCount { get; set; }
}

public class OutletListItemDto
{
    public int Id { get; set; }
    public string OutletName { get; set; } = "";
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public int ReferenceCount { get; set; }
}

public class CreateOutletRequestDto
{
    public string OutletName { get; set; } = "";
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
}

public class UpdateOutletRequestDto
{
    public string OutletName { get; set; } = "";
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
}

public class OutletMutationResponseDto
{
    public int Id { get; set; }
    public string OutletName { get; set; } = "";
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
}
