using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api/shifts")]
public class ShiftsController : ControllerBase
{
    private readonly ICashierShiftService _shiftService;

    public ShiftsController(ICashierShiftService shiftService)
    {
        _shiftService = shiftService;
    }

    [HttpGet("form-data")]
    public async Task<IActionResult> GetFormData()
    {
        var result = await _shiftService.GetFormDataAsync();
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("report")]
    public async Task<IActionResult> GetReport(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int? userId,
        [FromQuery] string? shiftStatus)
    {
        var filter = new CashierReportFilterDto
        {
            DateFrom = dateFrom,
            DateTo = dateTo,
            UserId = userId,
            ShiftStatus = shiftStatus
        };

        var result = await _shiftService.GetReportAsync(filter);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _shiftService.GetAllAsync();
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var result = await _shiftService.GetByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCashierShiftRequestDto request)
    {
        var result = await _shiftService.CreateAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateCashierShiftRequestDto request)
    {
        var result = await _shiftService.UpdateAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
