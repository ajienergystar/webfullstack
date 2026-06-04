namespace LatihanASP.Application.DTOs;

public class PosRoleDto
{
    public int Id { get; set; }
    public string RoleName { get; set; } = "";
}

public class PosUserListItemDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Username { get; set; } = "";
    public int? RoleId { get; set; }
    public string RoleName { get; set; } = "";
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PosUserListResponseDto
{
    public List<PosUserListItemDto> Users { get; set; } = [];
    public int TotalCount { get; set; }
}

public class PosUserDetailDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Username { get; set; } = "";
    public int? RoleId { get; set; }
    public string RoleName { get; set; } = "";
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PosUserFormDataDto
{
    public List<PosRoleDto> Roles { get; set; } = [];
}

public class CreatePosUserRequestDto
{
    public string FullName { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public int RoleId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdatePosUserRequestDto
{
    public string FullName { get; set; } = "";
    public string Username { get; set; } = "";
    public string? Password { get; set; }
    public int RoleId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreatePosUserResponseDto
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
}
