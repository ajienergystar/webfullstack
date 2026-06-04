namespace LatihanASP.Application.DTOs;

public class MembershipListResponseDto
{
    public List<MembershipListItemDto> Memberships { get; set; } = [];
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
}

public class MembershipListItemDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = "";
    public string? PhoneNumber { get; set; }
    public string MemberCode { get; set; } = "";
    public string MemberLevel { get; set; } = "";
    public DateTime JoinDate { get; set; }
    public DateTime? ExpiredDate { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
    public int LoyaltyPoint { get; set; }
}

public class MembershipCustomerOptionDto
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = "";
    public string? PhoneNumber { get; set; }
}

public class CreateMembershipRequestDto
{
    public int CustomerId { get; set; }
    public string MemberCode { get; set; } = "";
    public string MemberLevel { get; set; } = "";
    public DateTime JoinDate { get; set; }
    public DateTime? ExpiredDate { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

public class UpdateMembershipRequestDto : CreateMembershipRequestDto
{
}

public class MembershipMutationResponseDto
{
    public int Id { get; set; }
    public string MemberCode { get; set; } = "";
}
