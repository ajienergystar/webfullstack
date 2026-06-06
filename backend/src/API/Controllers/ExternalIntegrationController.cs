using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api/integrations")]
public class ExternalIntegrationController : ControllerBase
{
    private readonly IExternalIntegrationService _integrationService;

    public ExternalIntegrationController(IExternalIntegrationService integrationService)
    {
        _integrationService = integrationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] string? integrationType,
        [FromQuery] string? provider,
        [FromQuery] int? outletId)
    {
        var result = await _integrationService.GetListAsync(
            search, isActive, integrationType, provider, outletId);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _integrationService.GetByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExternalIntegrationRequestDto request)
    {
        var result = await _integrationService.CreateAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateExternalIntegrationRequestDto request)
    {
        var result = await _integrationService.UpdateAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _integrationService.DeleteAsync(id);
        return result.IsSuccess
            ? Ok(new { success = true })
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
