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
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IBrandService, BrandService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<IStockService, StockService>();
        services.AddScoped<ICashBankService, CashBankService>();
        services.AddScoped<IExpenseService, ExpenseService>();
        services.AddScoped<IHutangPiutangService, HutangPiutangService>();
        services.AddScoped<ITaxService, TaxService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IMembershipService, MembershipService>();
        services.AddScoped<IMembershipLevelService, MembershipLevelService>();
        services.AddScoped<IPosUserService, PosUserService>();
        services.AddScoped<IPosRoleService, PosRoleService>();
        services.AddScoped<ICashierShiftService, CashierShiftService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<IPurchaseService, PurchaseService>();
        services.AddScoped<IOutletService, OutletService>();
        services.AddScoped<IStockTransferService, StockTransferService>();
        services.AddScoped<IProductDiscountService, ProductDiscountService>();
        services.AddScoped<IVoucherService, VoucherService>();
        services.AddScoped<IProductBundleService, ProductBundleService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<ISystemSettingsService, SystemSettingsService>();
        services.AddScoped<IPrinterService, PrinterService>();
        services.AddScoped<IPaymentGatewayService, PaymentGatewayService>();
        services.AddScoped<IExternalIntegrationService, ExternalIntegrationService>();
        services.AddScoped<IDatabaseBackupService, DatabaseBackupService>();
        services.AddScoped<IOnlineOrderService, OnlineOrderService>();
        services.AddScoped<IOfflineModeService, OfflineModeService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        return services;
    }
}
