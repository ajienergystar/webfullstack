using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface IDashboardRepository
{
    Task<DashboardResponseDto> GetDashboardDataAsync();
}
