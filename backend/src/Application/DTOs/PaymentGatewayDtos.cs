namespace LatihanASP.Application.DTOs;

public class PaymentGatewayListResponseDto
{
    public List<PaymentGatewayListItemDto> Gateways { get; set; } = [];
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
    public int DefaultCount { get; set; }
}

public class PaymentGatewayListItemDto
{
    public int Id { get; set; }
    public string GatewayName { get; set; } = "";
    public string Provider { get; set; } = "";
    public string? MerchantId { get; set; }
    public string? ClientKey { get; set; }
    public string? ServerKeyMasked { get; set; }
    public string Environment { get; set; } = "Sandbox";
    public string? SupportedMethods { get; set; }
    public string? CallbackUrl { get; set; }
    public int? OutletId { get; set; }
    public string? OutletName { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class PaymentGatewayDetailDto : PaymentGatewayListItemDto
{
    public string? ServerKey { get; set; }
}

public class CreatePaymentGatewayRequestDto
{
    public string GatewayName { get; set; } = "";
    public string Provider { get; set; } = "Midtrans";
    public string? MerchantId { get; set; }
    public string? ClientKey { get; set; }
    public string? ServerKey { get; set; }
    public string Environment { get; set; } = "Sandbox";
    public string? SupportedMethods { get; set; }
    public string? CallbackUrl { get; set; }
    public int? OutletId { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdatePaymentGatewayRequestDto : CreatePaymentGatewayRequestDto
{
}

public class PaymentGatewayMutationResponseDto
{
    public int Id { get; set; }
    public string GatewayName { get; set; } = "";
}
