namespace LatihanASP.Application.DTOs;

public class CashBankOutletOptionDto
{
    public int Id { get; set; }
    public string OutletName { get; set; } = "";
}

public class CashBankUserOptionDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Username { get; set; } = "";
}

public class CashBankFormDataDto
{
    public List<CashBankOutletOptionDto> Outlets { get; set; } = [];
    public List<CashBankUserOptionDto> Users { get; set; } = [];
    public List<CashAccountOptionDto> Accounts { get; set; } = [];
}

public class CashAccountOptionDto
{
    public int Id { get; set; }
    public string AccountCode { get; set; } = "";
    public string AccountName { get; set; } = "";
    public string AccountType { get; set; } = "";
    public decimal CurrentBalance { get; set; }
}

public class CashAccountListItemDto
{
    public int Id { get; set; }
    public string AccountCode { get; set; } = "";
    public string AccountName { get; set; } = "";
    public string? AccountNumber { get; set; }
    public string AccountType { get; set; } = "";
    public string? BankName { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal CurrentBalance { get; set; }
    public int? OutletId { get; set; }
    public string? OutletName { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CashAccountListResponseDto
{
    public List<CashAccountListItemDto> Accounts { get; set; } = [];
    public int TotalCount { get; set; }
    public decimal TotalCashBalance { get; set; }
    public decimal TotalBankBalance { get; set; }
}

public class CashAccountDetailDto : CashAccountListItemDto;

public class CreateCashAccountRequestDto
{
    public string AccountCode { get; set; } = "";
    public string AccountName { get; set; } = "";
    public string? AccountNumber { get; set; }
    public string AccountType { get; set; } = "";
    public string? BankName { get; set; }
    public decimal OpeningBalance { get; set; }
    public int? OutletId { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

public class UpdateCashAccountRequestDto : CreateCashAccountRequestDto;

public class CashAccountMutationResponseDto
{
    public int Id { get; set; }
    public string AccountCode { get; set; } = "";
}

public class CashTransactionListItemDto
{
    public long Id { get; set; }
    public int CashAccountId { get; set; }
    public string AccountCode { get; set; } = "";
    public string AccountName { get; set; } = "";
    public string TransactionType { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Description { get; set; }
    public int? UserId { get; set; }
    public string? UserFullName { get; set; }
    public int? OutletId { get; set; }
    public string? OutletName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CashTransactionListResponseDto
{
    public List<CashTransactionListItemDto> Transactions { get; set; } = [];
    public int TotalCount { get; set; }
}

public class CashTransactionDetailDto : CashTransactionListItemDto;

public class CreateCashTransactionRequestDto
{
    public int CashAccountId { get; set; }
    public string TransactionType { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Description { get; set; }
    public int? UserId { get; set; }
    public int? OutletId { get; set; }
}

public class UpdateCashTransactionRequestDto : CreateCashTransactionRequestDto;

public class CashTransactionMutationResponseDto
{
    public long Id { get; set; }
    public string? ReferenceNumber { get; set; }
}
