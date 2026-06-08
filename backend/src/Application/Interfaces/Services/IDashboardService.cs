using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IDashboardService
{
    Task<ServiceResult<DashboardResponseDto>> GetDashboardAsync();
}
