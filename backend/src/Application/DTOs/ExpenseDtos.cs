namespace LatihanASP.Application.DTOs;

public class ExpenseListItemDto
{
    public long Id { get; set; }
    public string ExpenseName { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Notes { get; set; }
}

public class ExpenseListResponseDto
{
    public int TotalCount { get; set; }
    public decimal TotalAmount { get; set; }
    public List<ExpenseListItemDto> Expenses { get; set; } = [];
}

public class CreateExpenseRequestDto
{
    public string ExpenseName { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Notes { get; set; }
}

public class UpdateExpenseRequestDto
{
    public string ExpenseName { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Notes { get; set; }
}

public class ExpenseMutationResponseDto
{
    public long Id { get; set; }
    public string ExpenseName { get; set; } = "";
}
