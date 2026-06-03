using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api/stock")]
public class StockController : ControllerBase
{
    private readonly IStockService _stockService;

    public StockController(IStockService stockService)
    {
        _stockService = stockService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(
        [FromQuery] string? search,
        [FromQuery] bool lowStockOnly = false)
    {
        var result = await _stockService.GetOverviewAsync(search, lowStockOnly);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("movements")]
    public async Task<IActionResult> GetMovements(
        [FromQuery] string? search,
        [FromQuery] string? movementType,
        [FromQuery] int? productId)
    {
        var result = await _stockService.GetMovementsAsync(search, movementType, productId);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("form-data")]
    public async Task<IActionResult> GetFormData()
    {
        var result = await _stockService.GetFormDataAsync();
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost("adjust")]
    public async Task<IActionResult> Adjust([FromBody] CreateStockAdjustmentRequestDto request)
    {
        var result = await _stockService.AdjustStockAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
