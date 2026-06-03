using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface IDashboardService
{
    Task<ServiceResult<DashboardResponseDto>> GetDashboardAsync();
}
