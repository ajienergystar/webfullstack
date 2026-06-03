using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Interfaces;
using LatihanASP.Infrastructure.ExternalServices;
using LatihanASP.Infrastructure.Identity;
using LatihanASP.Infrastructure.Persistence;
using LatihanASP.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LatihanASP.Infrastructure.DependencyInjection;

public static class InfrastructureServiceRegistration
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<EmailSettings>(configuration.GetSection(EmailSettings.SectionName));

        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddSingleton<IPosSqlConnectionFactory, PosSqlConnectionFactory>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IDashboardRepository, DashboardRepository>();
        services.AddScoped<ISalesRepository, SalesRepository>();
        services.AddScoped<IHoldRepository, HoldRepository>();
        services.AddScoped<IRefundRepository, RefundRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IUserSessionRepository, UserSessionRepository>();
        services.AddScoped<IPasswordResetRepository, PasswordResetRepository>();
        services.AddScoped<IEmailVerificationRepository, EmailVerificationRepository>();
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();

        return services;
    }
}
