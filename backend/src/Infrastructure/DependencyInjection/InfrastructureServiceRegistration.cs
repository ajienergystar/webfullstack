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
        services.AddScoped<IBrandRepository, BrandRepository>();
        services.AddScoped<ISupplierRepository, SupplierRepository>();
        services.AddScoped<IStockRepository, StockRepository>();
        services.AddScoped<ICashBankRepository, CashBankRepository>();
        services.AddScoped<IExpenseRepository, ExpenseRepository>();
        services.AddScoped<IHutangPiutangRepository, HutangPiutangRepository>();
        services.AddScoped<ITaxRepository, TaxRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IMembershipRepository, MembershipRepository>();
        services.AddScoped<IMembershipLevelRepository, MembershipLevelRepository>();
        services.AddScoped<IHutangPiutangRepository, HutangPiutangRepository>();
        services.AddScoped<IPosUserRepository, PosUserRepository>();
        services.AddScoped<IPosRoleRepository, PosRoleRepository>();
        services.AddScoped<ICashierShiftRepository, CashierShiftRepository>();
        services.AddScoped<IAttendanceRepository, AttendanceRepository>();
        services.AddScoped<IPurchaseRepository, PurchaseRepository>();
        services.AddScoped<IOutletRepository, OutletRepository>();
        services.AddScoped<IStockTransferRepository, StockTransferRepository>();
        services.AddScoped<IProductDiscountRepository, ProductDiscountRepository>();
        services.AddScoped<IVoucherRepository, VoucherRepository>();
        services.AddScoped<IProductBundleRepository, ProductBundleRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<ISystemSettingsRepository, SystemSettingsRepository>();
        services.AddScoped<IPrinterRepository, PrinterRepository>();
        services.AddScoped<IPaymentGatewayRepository, PaymentGatewayRepository>();
        services.AddScoped<IUserSessionRepository, UserSessionRepository>();
        services.AddScoped<IPasswordResetRepository, PasswordResetRepository>();
        services.AddScoped<IEmailVerificationRepository, EmailVerificationRepository>();
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();

        return services;
    }
}
