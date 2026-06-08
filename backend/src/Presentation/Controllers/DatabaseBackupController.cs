using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.Presentation.Controllers;

[ApiController]
[Route("api/backups")]
public class DatabaseBackupController : ControllerBase
{
    private readonly IDatabaseBackupService _backupService;

    public DatabaseBackupController(IDatabaseBackupService backupService)
    {
        _backupService = backupService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] string? backupType,
        [FromQuery] string? status)
    {
        var result = await _backupService.GetListAsync(search, backupType, status);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDatabaseBackupRequestDto request)
    {
        var result = await _backupService.CreateAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download(int id)
    {
        var result = await _backupService.GetDownloadInfoAsync(id);
        if (!result.IsSuccess || result.Data is null)
            return BadRequest(new ErrorResponseDto(result.Error!));

        if (!System.IO.File.Exists(result.Data.FilePath))
            return BadRequest(new ErrorResponseDto("File backup tidak ditemukan di server."));

        var bytes = await System.IO.File.ReadAllBytesAsync(result.Data.FilePath);
        return File(bytes, "application/json", result.Data.FileName);
    }

    [HttpPost("{id:int}/restore")]
    public async Task<IActionResult> RestoreFromId(int id)
    {
        var result = await _backupService.RestoreFromBackupIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost("restore")]
    public async Task<IActionResult> RestoreFromUpload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new ErrorResponseDto("File backup wajib diunggah."));

        await using var stream = file.OpenReadStream();
        var result = await _backupService.RestoreFromFileAsync(stream, file.FileName);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _backupService.DeleteAsync(id);
        return result.IsSuccess
            ? Ok(new { success = true })
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
