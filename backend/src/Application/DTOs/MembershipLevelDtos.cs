namespace LatihanASP.Application.DTOs;

public class MembershipLevelListResponseDto
{
    public List<MembershipLevelListItemDto> Levels { get; set; } = [];
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
}

public class MembershipLevelListItemDto
{
    public int Id { get; set; }
    public string LevelName { get; set; } = "";
    public int MinLoyaltyPoint { get; set; }
    public decimal DiscountPercent { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public int MemberCount { get; set; }
}

public class CreateMembershipLevelRequestDto
{
    public string LevelName { get; set; } = "";
    public int MinLoyaltyPoint { get; set; }
    public decimal DiscountPercent { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateMembershipLevelRequestDto : CreateMembershipLevelRequestDto
{
}

public class MembershipLevelMutationResponseDto
{
    public int Id { get; set; }
    public string LevelName { get; set; } = "";
}
