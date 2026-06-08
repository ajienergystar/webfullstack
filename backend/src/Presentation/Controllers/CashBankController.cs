using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.Presentation.Controllers;

[ApiController]
[Route("api/cash-bank")]
public class CashBankController : ControllerBase
{
    private readonly ICashBankService _cashBankService;

    public CashBankController(ICashBankService cashBankService)
    {
        _cashBankService = cashBankService;
    }

    [HttpGet("form-data")]
    public async Task<IActionResult> GetFormData()
    {
        var result = await _cashBankService.GetFormDataAsync();
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("accounts")]
    public async Task<IActionResult> GetAccounts(
        [FromQuery] string? search,
        [FromQuery] string? accountType)
    {
        var result = await _cashBankService.GetAccountsAsync(search, accountType);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("accounts/{id:int}")]
    public async Task<IActionResult> GetAccountById(int id)
    {
        var result = await _cashBankService.GetAccountByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost("accounts")]
    public async Task<IActionResult> CreateAccount([FromBody] CreateCashAccountRequestDto request)
    {
        var result = await _cashBankService.CreateAccountAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPut("accounts/{id:int}")]
    public async Task<IActionResult> UpdateAccount(int id, [FromBody] UpdateCashAccountRequestDto request)
    {
        var result = await _cashBankService.UpdateAccountAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpDelete("accounts/{id:int}")]
    public async Task<IActionResult> DeleteAccount(int id)
    {
        var result = await _cashBankService.DeleteAccountAsync(id);
        return result.IsSuccess
            ? Ok(new { success = true })
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] int? accountId,
        [FromQuery] string? transactionType,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        var result = await _cashBankService.GetTransactionsAsync(
            accountId, transactionType, dateFrom, dateTo);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpGet("transactions/{id:long}")]
    public async Task<IActionResult> GetTransactionById(long id)
    {
        var result = await _cashBankService.GetTransactionByIdAsync(id);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPost("transactions")]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateCashTransactionRequestDto request)
    {
        var result = await _cashBankService.CreateTransactionAsync(request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpPut("transactions/{id:long}")]
    public async Task<IActionResult> UpdateTransaction(long id, [FromBody] UpdateCashTransactionRequestDto request)
    {
        var result = await _cashBankService.UpdateTransactionAsync(id, request);
        return result.IsSuccess
            ? Ok(result.Data)
            : BadRequest(new ErrorResponseDto(result.Error!));
    }

    [HttpDelete("transactions/{id:long}")]
    public async Task<IActionResult> DeleteTransaction(long id)
    {
        var result = await _cashBankService.DeleteTransactionAsync(id);
        return result.IsSuccess
            ? Ok(new { success = true })
            : BadRequest(new ErrorResponseDto(result.Error!));
    }
}
