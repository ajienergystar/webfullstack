namespace LatihanASP.Application.DTOs;

public class CashierShiftUserDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Username { get; set; } = "";
}

public class CashierShiftListItemDto
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public string UserFullName { get; set; } = "";
    public string Username { get; set; } = "";
    public DateTime OpenTime { get; set; }
    public DateTime? CloseTime { get; set; }
    public decimal? OpeningCash { get; set; }
    public decimal? ClosingCash { get; set; }
}

public class CashierShiftListResponseDto
{
    public List<CashierShiftListItemDto> Shifts { get; set; } = [];
    public int TotalCount { get; set; }
}

public class CashierShiftDetailDto
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public string UserFullName { get; set; } = "";
    public string Username { get; set; } = "";
    public DateTime OpenTime { get; set; }
    public DateTime? CloseTime { get; set; }
    public decimal? OpeningCash { get; set; }
    public decimal? ClosingCash { get; set; }
}

public class CashierShiftFormDataDto
{
    public List<CashierShiftUserDto> Users { get; set; } = [];
}

public class CreateCashierShiftRequestDto
{
    public int UserId { get; set; }
    public DateTime OpenTime { get; set; }
    public DateTime? CloseTime { get; set; }
    public decimal OpeningCash { get; set; }
    public decimal? ClosingCash { get; set; }
}

public class UpdateCashierShiftRequestDto
{
    public int UserId { get; set; }
    public DateTime OpenTime { get; set; }
    public DateTime? CloseTime { get; set; }
    public decimal OpeningCash { get; set; }
    public decimal? ClosingCash { get; set; }
}

public class CreateCashierShiftResponseDto
{
    public long Id { get; set; }
}
