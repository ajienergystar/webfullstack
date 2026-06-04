using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api/outlets")]
public class OutletController : ControllerBase
{
    private readonly IOutletService _outletService;

    public OutletController(IOutletService outletService)
    {
        _outletService = outletService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] string? search)
    {
        var result = await _outletService.GetListAsync(search);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _outletService.GetByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOutletRequestDto request)
    {
        var result = await _outletService.CreateAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateOutletRequestDto request)
    {
        var result = await _outletService.UpdateAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _outletService.DeleteAsync(id);
        return result.IsSuccess
            ? Ok(new { success = true })
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
