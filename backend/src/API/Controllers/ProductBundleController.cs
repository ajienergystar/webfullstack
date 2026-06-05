using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api/product-bundles")]
public class ProductBundleController : ControllerBase
{
    private readonly IProductBundleService _productBundleService;

    public ProductBundleController(IProductBundleService productBundleService)
    {
        _productBundleService = productBundleService;
    }

    [HttpGet("form-data")]
    public async Task<IActionResult> GetFormData()
    {
        var result = await _productBundleService.GetFormDataAsync();
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] bool? isActive)
    {
        var result = await _productBundleService.GetListAsync(search, isActive);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _productBundleService.GetByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductBundleRequestDto request)
    {
        var result = await _productBundleService.CreateAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductBundleRequestDto request)
    {
        var result = await _productBundleService.UpdateAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _productBundleService.DeleteAsync(id);
        return result.IsSuccess
            ? Ok(new { success = true })
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
