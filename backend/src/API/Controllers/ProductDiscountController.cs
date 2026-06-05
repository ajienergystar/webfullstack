using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api/product-discounts")]
public class ProductDiscountController : ControllerBase
{
    private readonly IProductDiscountService _productDiscountService;

    public ProductDiscountController(IProductDiscountService productDiscountService)
    {
        _productDiscountService = productDiscountService;
    }

    [HttpGet("form-data")]
    public async Task<IActionResult> GetFormData()
    {
        var result = await _productDiscountService.GetFormDataAsync();
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] string? discountType,
        [FromQuery] bool? isActive)
    {
        var result = await _productDiscountService.GetListAsync(search, discountType, isActive);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _productDiscountService.GetByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductDiscountRequestDto request)
    {
        var result = await _productDiscountService.CreateAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductDiscountRequestDto request)
    {
        var result = await _productDiscountService.UpdateAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _productDiscountService.DeleteAsync(id);
        return result.IsSuccess
            ? Ok(new { success = true })
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
