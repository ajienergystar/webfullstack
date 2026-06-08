using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IAuditLogService
{
    Task<ServiceResult<AuditLogListResponseDto>> GetListAsync(
        string? search,
        DateTime? dateFrom,
        DateTime? dateTo,
        int? userId,
        string? tableName);
}
