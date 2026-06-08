using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _repository;

    public AuditLogService(IAuditLogRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<AuditLogListResponseDto>> GetListAsync(
        string? search,
        DateTime? dateFrom,
        DateTime? dateTo,
        int? userId,
        string? tableName)
    {
        try
        {
            var data = await _repository.GetListAsync(search, dateFrom, dateTo, userId, tableName);
            return ServiceResult<AuditLogListResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<AuditLogListResponseDto>.Failure(
                "Gagal memuat audit log. Pastikan database POS sudah diinisialisasi.");
        }
    }
}
