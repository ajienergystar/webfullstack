using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly IDashboardRepository _dashboardRepository;

    public DashboardService(IDashboardRepository dashboardRepository)
    {
        _dashboardRepository = dashboardRepository;
    }

    public async Task<ServiceResult<DashboardResponseDto>> GetDashboardAsync()
    {
        try
        {
            var data = await _dashboardRepository.GetDashboardDataAsync();
            return ServiceResult<DashboardResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<DashboardResponseDto>.Failure(
                "Gagal memuat data dashboard. Pastikan database POS sudah diinisialisasi.");
        }
    }
}
