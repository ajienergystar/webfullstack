namespace LatihanASP.Application.DTOs;

public class AttendanceUserDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Username { get; set; } = "";
}

public class AttendanceOutletDto
{
    public int Id { get; set; }
    public string OutletName { get; set; } = "";
}

public class AttendanceListItemDto
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public string UserFullName { get; set; } = "";
    public string Username { get; set; } = "";
    public int? OutletId { get; set; }
    public string OutletName { get; set; } = "";
    public DateOnly AttendanceDate { get; set; }
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }
    public string Status { get; set; } = "";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AttendanceListResponseDto
{
    public List<AttendanceListItemDto> Records { get; set; } = [];
    public int TotalCount { get; set; }
}

public class AttendanceDetailDto
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public string UserFullName { get; set; } = "";
    public string Username { get; set; } = "";
    public int? OutletId { get; set; }
    public string OutletName { get; set; } = "";
    public DateOnly AttendanceDate { get; set; }
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }
    public string Status { get; set; } = "";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AttendanceFormDataDto
{
    public List<AttendanceUserDto> Users { get; set; } = [];
    public List<AttendanceOutletDto> Outlets { get; set; } = [];
    public List<string> StatusOptions { get; set; } = ["Present", "Late", "Absent", "Leave", "HalfDay"];
}

public class CreateAttendanceRequestDto
{
    public int UserId { get; set; }
    public int? OutletId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }
    public string Status { get; set; } = "Present";
    public string? Notes { get; set; }
}

public class UpdateAttendanceRequestDto
{
    public int UserId { get; set; }
    public int? OutletId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }
    public string Status { get; set; } = "Present";
    public string? Notes { get; set; }
}

public class CreateAttendanceResponseDto
{
    public long Id { get; set; }
}
