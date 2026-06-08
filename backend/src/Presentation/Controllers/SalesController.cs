using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.Presentation.Controllers;

[ApiController]
[Route("api/sales")]
public class SalesController : ControllerBase
{
    private readonly ISalesService _salesService;

    public SalesController(ISalesService salesService)
    {
        _salesService = salesService;
    }

    [HttpGet("form-data")]
    public async Task<IActionResult> GetFormData()
    {
        var result = await _salesService.GetFormDataAsync();
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost]
    public async Task<IActionResult> CreateSale([FromBody] CreateSaleRequestDto request)
    {
        var result = await _salesService.CreateSaleAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? invoiceNumber,
        [FromQuery] int? customerId,
        [FromQuery] int? outletId,
        [FromQuery] int? userId,
        [FromQuery] string? paymentMethod)
    {
        var filter = new SalesHistoryFilterDto
        {
            DateFrom = dateFrom,
            DateTo = dateTo,
            InvoiceNumber = invoiceNumber,
            CustomerId = customerId,
            OutletId = outletId,
            UserId = userId,
            PaymentMethod = paymentMethod
        };

        var result = await _salesService.GetHistoryAsync(filter);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetTransaction(long id)
    {
        var result = await _salesService.GetTransactionByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
