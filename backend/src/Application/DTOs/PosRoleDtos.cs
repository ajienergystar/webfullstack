namespace LatihanASP.Application.DTOs;

public class PosPermissionDto
{
    public int Id { get; set; }
    public string PermissionName { get; set; } = "";
}

public class PosRoleListItemDto
{
    public int Id { get; set; }
    public string RoleName { get; set; } = "";
    public int PermissionCount { get; set; }
    public List<string> PermissionNames { get; set; } = [];
    public int UserCount { get; set; }
}

public class PosRoleListResponseDto
{
    public List<PosRoleListItemDto> Roles { get; set; } = [];
    public int TotalCount { get; set; }
}

public class PosRoleDetailDto
{
    public int Id { get; set; }
    public string RoleName { get; set; } = "";
    public List<int> PermissionIds { get; set; } = [];
}

public class PosRoleFormDataDto
{
    public List<PosPermissionDto> Permissions { get; set; } = [];
}

public class CreatePosRoleRequestDto
{
    public string RoleName { get; set; } = "";
    public List<int> PermissionIds { get; set; } = [];
}

public class UpdatePosRoleRequestDto
{
    public string RoleName { get; set; } = "";
    public List<int> PermissionIds { get; set; } = [];
}

public class CreatePosRoleResponseDto
{
    public int Id { get; set; }
    public string RoleName { get; set; } = "";
}
