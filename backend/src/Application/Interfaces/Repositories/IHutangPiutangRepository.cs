using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IHutangPiutangRepository
{
    Task<HutangPiutangListResponseDto> GetListAsync(
        string? search, string? type, string? status, int? customerId);
    Task<HutangPiutangListItemDto?> GetByIdAsync(long id);
    Task<List<HutangPiutangCustomerOptionDto>> GetCustomersAsync();
    Task<List<HutangPiutangSalesOptionDto>> GetSalesOptionsAsync(int customerId);
    Task<HutangPiutangMutationResponseDto> CreateAsync(CreateHutangPiutangRequestDto request);
    Task<HutangPiutangMutationResponseDto> UpdateAsync(long id, UpdateHutangPiutangRequestDto request);
    Task DeleteAsync(long id);
}
