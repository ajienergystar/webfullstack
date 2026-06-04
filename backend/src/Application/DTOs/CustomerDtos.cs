namespace LatihanASP.Application.DTOs;

public class CustomerListResponseDto
{
    public List<CustomerListItemDto> Customers { get; set; } = [];
    public int TotalCount { get; set; }
    public int TotalLoyaltyPoints { get; set; }
}

public class CustomerListItemDto
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = "";
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public int LoyaltyPoint { get; set; }
    public int TransactionCount { get; set; }
}

public class CreateCustomerRequestDto
{
    public string CustomerName { get; set; } = "";
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public int LoyaltyPoint { get; set; }
}

public class UpdateCustomerRequestDto : CreateCustomerRequestDto
{
}

public class CustomerMutationResponseDto
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = "";
}
