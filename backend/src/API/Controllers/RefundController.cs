using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api/refund")]
public class RefundController : ControllerBase
{
    private readonly IRefundService _refundService;

    public RefundController(IRefundService refundService)
    {
        _refundService = refundService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] string? invoiceNumber)
    {
        var result = await _refundService.GetListAsync(invoiceNumber);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("sale/{salesId:long}")]
    public async Task<IActionResult> GetSaleForRefund(long salesId)
    {
        var result = await _refundService.GetSaleForRefundAsync(salesId);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("sale/by-invoice")]
    public async Task<IActionResult> GetSaleByInvoice([FromQuery] string invoiceNumber)
    {
        var result = await _refundService.GetSaleForRefundByInvoiceAsync(invoiceNumber);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var result = await _refundService.GetByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRefundRequestDto request)
    {
        var result = await _refundService.CreateAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
