using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api/online-orders")]
public class OnlineOrderController : ControllerBase
{
    private readonly IOnlineOrderService _onlineOrderService;

    public OnlineOrderController(IOnlineOrderService onlineOrderService)
    {
        _onlineOrderService = onlineOrderService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? orderStatus,
        [FromQuery] string? paymentStatus,
        [FromQuery] string? orderSource,
        [FromQuery] int? outletId)
    {
        var result = await _onlineOrderService.GetListAsync(
            search, dateFrom, dateTo, orderStatus, paymentStatus, orderSource, outletId);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var result = await _onlineOrderService.GetByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateOnlineOrderStatusRequestDto request)
    {
        var result = await _onlineOrderService.UpdateStatusAsync(id, request);
        return result.IsSuccess
            ? Ok(new MessageResponseDto("Status pesanan diperbarui."))
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost("{id:long}/complete")]
    public async Task<IActionResult> Complete(long id, [FromBody] CompleteOnlineOrderRequestDto request)
    {
        var result = await _onlineOrderService.CompleteAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
