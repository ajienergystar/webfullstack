using LatihanASP.Application.Interfaces;
using LatihanASP.Application.Services;
using LatihanASP.Application.Settings;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LatihanASP.Application.DependencyInjection;

public static class ApplicationServiceRegistration
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AppSettings>(configuration.GetSection(AppSettings.SectionName));
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<ISalesService, SalesService>();
        services.AddScoped<IHoldService, HoldService>();
        services.AddScoped<IRefundService, RefundService>();
        services.AddScoped<IPosUserService, PosUserService>();
        services.AddScoped<IPosRoleService, PosRoleService>();
        services.AddScoped<ICashierShiftService, CashierShiftService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        return services;
    }
}
