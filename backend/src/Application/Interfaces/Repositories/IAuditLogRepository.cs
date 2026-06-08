using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IAuditLogRepository
{
    Task<AuditLogListResponseDto> GetListAsync(
        string? search,
        DateTime? dateFrom,
        DateTime? dateTo,
        int? userId,
        string? tableName);
}
