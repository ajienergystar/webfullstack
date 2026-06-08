using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IHutangPiutangService
{
    Task<ServiceResult<HutangPiutangListResponseDto>> GetListAsync(
        string? search, string? type, string? status, int? customerId);
    Task<ServiceResult<HutangPiutangListItemDto>> GetByIdAsync(long id);
    Task<ServiceResult<List<HutangPiutangCustomerOptionDto>>> GetCustomersAsync();
    Task<ServiceResult<List<HutangPiutangSalesOptionDto>>> GetSalesOptionsAsync(int customerId);
    Task<ServiceResult<HutangPiutangMutationResponseDto>> CreateAsync(CreateHutangPiutangRequestDto request);
    Task<ServiceResult<HutangPiutangMutationResponseDto>> UpdateAsync(
        long id, UpdateHutangPiutangRequestDto request);
    Task<ServiceResult<bool>> DeleteAsync(long id);
}
