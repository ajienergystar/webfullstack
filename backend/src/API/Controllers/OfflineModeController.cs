using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api/offline-mode")]
public class OfflineModeController : ControllerBase
{
    private readonly IOfflineModeService _offlineModeService;

    public OfflineModeController(IOfflineModeService offlineModeService)
    {
        _offlineModeService = offlineModeService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] int? outletId,
        [FromQuery] string? syncStatus,
        [FromQuery] string? queueStatus,
        [FromQuery] int? deviceId)
    {
        var result = await _offlineModeService.GetListAsync(search, outletId, syncStatus, queueStatus, deviceId);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("devices/{id:int}")]
    public async Task<IActionResult> GetDeviceById(int id)
    {
        var result = await _offlineModeService.GetDeviceByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPatch("devices/{id:int}")]
    public async Task<IActionResult> UpdateDevice(int id, [FromBody] UpdateOfflineDeviceRequestDto request)
    {
        var result = await _offlineModeService.UpdateDeviceAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost("devices/{id:int}/sync")]
    public async Task<IActionResult> SyncDevice(int id, [FromQuery] string syncType = "AutoSync")
    {
        var result = await _offlineModeService.SyncDeviceAsync(id, syncType);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost("queue/{id:long}/retry")]
    public async Task<IActionResult> RetryQueueItem(long id)
    {
        var result = await _offlineModeService.RetryQueueItemAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
