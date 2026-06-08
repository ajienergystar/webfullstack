using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.Presentation.Controllers;

[ApiController]
[Route("api/hold")]
public class HoldController : ControllerBase
{
    private readonly IHoldService _holdService;

    public HoldController(IHoldService holdService)
    {
        _holdService = holdService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActiveHolds()
    {
        var result = await _holdService.GetActiveHoldsAsync();
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var result = await _holdService.GetByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateHoldRequestDto request)
    {
        var result = await _holdService.CreateAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateHoldRequestDto request)
    {
        var result = await _holdService.UpdateAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Cancel(long id)
    {
        var result = await _holdService.CancelAsync(id);
        return result.IsSuccess
            ? Ok(new MessageResponseDto("Hold transaksi dibatalkan."))
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost("{id:long}/complete")]
    public async Task<IActionResult> Complete(long id, [FromBody] CompleteHoldRequestDto request)
    {
        var result = await _holdService.CompleteAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
