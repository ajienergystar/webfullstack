namespace LatihanASP.Application.DTOs;

public class VoucherListResponseDto
{
    public List<VoucherListItemDto> Vouchers { get; set; } = [];
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
}

public class VoucherListItemDto
{
    public int Id { get; set; }
    public string VoucherCode { get; set; } = "";
    public decimal? DiscountAmount { get; set; }
    public DateTime? ExpiredDate { get; set; }
    public bool IsActive { get; set; }
    public bool IsExpired { get; set; }
}

public class CreateVoucherRequestDto
{
    public string VoucherCode { get; set; } = "";
    public decimal? DiscountAmount { get; set; }
    public DateTime? ExpiredDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateVoucherRequestDto : CreateVoucherRequestDto
{
}

public class VoucherMutationResponseDto
{
    public int Id { get; set; }
    public string VoucherCode { get; set; } = "";
}
