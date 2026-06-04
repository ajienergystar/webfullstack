-- LatihanASP_POS - Point of Sale Database (SQL Server)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'LatihanASP_POS')
BEGIN
    CREATE DATABASE LatihanASP_POS;
END
GO

USE LatihanASP_POS;
GO

-- Drop tables (reverse FK order)
IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NOT NULL DROP TABLE dbo.AuditLogs;
IF OBJECT_ID(N'dbo.CashTransactions', N'U') IS NOT NULL DROP TABLE dbo.CashTransactions;
IF OBJECT_ID(N'dbo.CashAccounts', N'U') IS NOT NULL DROP TABLE dbo.CashAccounts;
IF OBJECT_ID(N'dbo.CashierShifts', N'U') IS NOT NULL DROP TABLE dbo.CashierShifts;
IF OBJECT_ID(N'dbo.RolePermissions', N'U') IS NOT NULL DROP TABLE dbo.RolePermissions;
IF OBJECT_ID(N'dbo.Permissions', N'U') IS NOT NULL DROP TABLE dbo.Permissions;
IF OBJECT_ID(N'dbo.Vouchers', N'U') IS NOT NULL DROP TABLE dbo.Vouchers;
IF OBJECT_ID(N'dbo.Taxes', N'U') IS NOT NULL DROP TABLE dbo.Taxes;
IF OBJECT_ID(N'dbo.Expenses', N'U') IS NOT NULL DROP TABLE dbo.Expenses;
IF OBJECT_ID(N'dbo.StockMovements', N'U') IS NOT NULL DROP TABLE dbo.StockMovements;
IF OBJECT_ID(N'dbo.PurchaseDetails', N'U') IS NOT NULL DROP TABLE dbo.PurchaseDetails;
IF OBJECT_ID(N'dbo.Purchases', N'U') IS NOT NULL DROP TABLE dbo.Purchases;
IF OBJECT_ID(N'dbo.RefundDetails', N'U') IS NOT NULL DROP TABLE dbo.RefundDetails;
IF OBJECT_ID(N'dbo.Refunds', N'U') IS NOT NULL DROP TABLE dbo.Refunds;
IF OBJECT_ID(N'dbo.HeldTransactionDetails', N'U') IS NOT NULL DROP TABLE dbo.HeldTransactionDetails;
IF OBJECT_ID(N'dbo.HeldTransactions', N'U') IS NOT NULL DROP TABLE dbo.HeldTransactions;
IF OBJECT_ID(N'dbo.SalesTransactionDetails', N'U') IS NOT NULL DROP TABLE dbo.SalesTransactionDetails;
IF OBJECT_ID(N'dbo.SalesTransactions', N'U') IS NOT NULL DROP TABLE dbo.SalesTransactions;
IF OBJECT_ID(N'dbo.Customers', N'U') IS NOT NULL DROP TABLE dbo.Customers;
IF OBJECT_ID(N'dbo.Suppliers', N'U') IS NOT NULL DROP TABLE dbo.Suppliers;
IF OBJECT_ID(N'dbo.Products', N'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID(N'dbo.Categories', N'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID(N'dbo.Outlets', N'U') IS NOT NULL DROP TABLE dbo.Outlets;
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL DROP TABLE dbo.Roles;
GO

-- ROLES
CREATE TABLE Roles (
    Id INT PRIMARY KEY IDENTITY(1,1),
    RoleName NVARCHAR(50) NOT NULL
);

-- USERS (POS)
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    FullName NVARCHAR(100),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255),
    RoleId INT,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id)
);

-- OUTLETS
CREATE TABLE Outlets (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OutletName NVARCHAR(100),
    Address NVARCHAR(255),
    PhoneNumber NVARCHAR(20)
);

-- CATEGORIES
CREATE TABLE Categories (
    Id INT PRIMARY KEY IDENTITY(1,1),
    CategoryName NVARCHAR(100) NOT NULL
);

-- PRODUCTS
CREATE TABLE Products (
    Id INT PRIMARY KEY IDENTITY(1,1),
    CategoryId INT,
    ProductCode NVARCHAR(50),
    ProductName NVARCHAR(150) NOT NULL,
    Barcode NVARCHAR(100),
    PurchasePrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Products_Purchase DEFAULT (0),
    SellingPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Products_Selling DEFAULT (0),
    Stock INT NOT NULL CONSTRAINT DF_Products_Stock DEFAULT (0),
    Unit NVARCHAR(20),
    IsActive BIT NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT (1),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES Categories(Id)
);

-- SUPPLIERS
CREATE TABLE Suppliers (
    Id INT PRIMARY KEY IDENTITY(1,1),
    SupplierName NVARCHAR(100),
    Address NVARCHAR(255),
    PhoneNumber NVARCHAR(20),
    Email NVARCHAR(100)
);

-- CUSTOMERS
CREATE TABLE Customers (
    Id INT PRIMARY KEY IDENTITY(1,1),
    CustomerName NVARCHAR(100),
    PhoneNumber NVARCHAR(20),
    Address NVARCHAR(255),
    LoyaltyPoint INT NOT NULL CONSTRAINT DF_Customers_Loyalty DEFAULT (0)
);

-- SALES
CREATE TABLE SalesTransactions (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    InvoiceNumber NVARCHAR(50) NOT NULL,
    TransactionDate DATETIME2 NOT NULL CONSTRAINT DF_Sales_Date DEFAULT (SYSUTCDATETIME()),
    CustomerId INT NULL,
    UserId INT,
    OutletId INT,
    SubTotal DECIMAL(18,2) NOT NULL,
    Discount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Sales_Discount DEFAULT (0),
    Tax DECIMAL(18,2) NOT NULL CONSTRAINT DF_Sales_Tax DEFAULT (0),
    GrandTotal DECIMAL(18,2) NOT NULL,
    PaymentMethod NVARCHAR(50),
    PaidAmount DECIMAL(18,2),
    ChangeAmount DECIMAL(18,2),
    CONSTRAINT FK_Sales_Customers FOREIGN KEY (CustomerId) REFERENCES Customers(Id),
    CONSTRAINT FK_Sales_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_Sales_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id)
);

CREATE TABLE SalesTransactionDetails (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    SalesTransactionId BIGINT NOT NULL,
    ProductId INT NOT NULL,
    Qty INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Discount DECIMAL(18,2) NOT NULL CONSTRAINT DF_SalesDetail_Discount DEFAULT (0),
    Total DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_SalesDetails_Sales FOREIGN KEY (SalesTransactionId) REFERENCES SalesTransactions(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SalesDetails_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
);

-- CUSTOMER HUTANG / PIUTANG
CREATE TABLE CustomerHutangPiutang (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    ReferenceNumber NVARCHAR(50) NOT NULL,
    CustomerId INT NOT NULL,
    Type NVARCHAR(20) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    PaidAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_CHP_PaidAmount DEFAULT (0),
    RecordDate DATETIME2 NOT NULL CONSTRAINT DF_CHP_RecordDate DEFAULT (SYSUTCDATETIME()),
    DueDate DATETIME2 NULL,
    SalesTransactionId BIGINT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_CHP_Status DEFAULT ('OPEN'),
    Description NVARCHAR(255) NULL,
    Notes NVARCHAR(255) NULL,
    CONSTRAINT UQ_CustomerHutangPiutang_Ref UNIQUE (ReferenceNumber),
    CONSTRAINT FK_CHP_Customers FOREIGN KEY (CustomerId) REFERENCES Customers(Id),
    CONSTRAINT FK_CHP_Sales FOREIGN KEY (SalesTransactionId) REFERENCES SalesTransactions(Id)
);

-- HELD TRANSACTIONS (Hold Transaksi)
CREATE TABLE HeldTransactions (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    HoldNumber NVARCHAR(50) NOT NULL,
    HeldAt DATETIME2 NOT NULL CONSTRAINT DF_Held_HeldAt DEFAULT (SYSUTCDATETIME()),
    CustomerId INT NULL,
    UserId INT NOT NULL,
    OutletId INT NOT NULL,
    SubTotal DECIMAL(18,2) NOT NULL,
    Discount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Held_Discount DEFAULT (0),
    Tax DECIMAL(18,2) NOT NULL CONSTRAINT DF_Held_Tax DEFAULT (0),
    GrandTotal DECIMAL(18,2) NOT NULL,
    Notes NVARCHAR(255) NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Held_Status DEFAULT ('HOLD'),
    CompletedSalesId BIGINT NULL,
    CompletedAt DATETIME2 NULL,
    CONSTRAINT FK_Held_Customers FOREIGN KEY (CustomerId) REFERENCES Customers(Id),
    CONSTRAINT FK_Held_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_Held_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id),
    CONSTRAINT FK_Held_Sales FOREIGN KEY (CompletedSalesId) REFERENCES SalesTransactions(Id)
);

CREATE TABLE HeldTransactionDetails (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    HeldTransactionId BIGINT NOT NULL,
    ProductId INT NOT NULL,
    Qty INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Discount DECIMAL(18,2) NOT NULL CONSTRAINT DF_HeldDetail_Discount DEFAULT (0),
    Total DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_HeldDetails_Held FOREIGN KEY (HeldTransactionId) REFERENCES HeldTransactions(Id) ON DELETE CASCADE,
    CONSTRAINT FK_HeldDetails_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
);

-- REFUNDS
CREATE TABLE Refunds (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    RefundNumber NVARCHAR(50) NOT NULL,
    RefundDate DATETIME2 NOT NULL CONSTRAINT DF_Refunds_Date DEFAULT (SYSUTCDATETIME()),
    SalesTransactionId BIGINT NOT NULL,
    UserId INT NOT NULL,
    OutletId INT NOT NULL,
    SubTotal DECIMAL(18,2) NOT NULL,
    TotalRefund DECIMAL(18,2) NOT NULL,
    Reason NVARCHAR(255) NULL,
    RefundMethod NVARCHAR(50) NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Refunds_Status DEFAULT ('COMPLETED'),
    CONSTRAINT FK_Refunds_Sales FOREIGN KEY (SalesTransactionId) REFERENCES SalesTransactions(Id),
    CONSTRAINT FK_Refunds_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_Refunds_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id)
);

CREATE TABLE RefundDetails (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    RefundId BIGINT NOT NULL,
    SalesTransactionDetailId BIGINT NOT NULL,
    ProductId INT NOT NULL,
    Qty INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Total DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_POS_RefundDetails_Refunds FOREIGN KEY (RefundId) REFERENCES Refunds(Id) ON DELETE CASCADE,
    CONSTRAINT FK_POS_RefundDetails_SalesDetail FOREIGN KEY (SalesTransactionDetailId) REFERENCES SalesTransactionDetails(Id),
    CONSTRAINT FK_POS_RefundDetails_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
);

-- PURCHASES
CREATE TABLE Purchases (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    InvoiceNumber NVARCHAR(50),
    SupplierId INT,
    PurchaseDate DATETIME2 NOT NULL CONSTRAINT DF_Purchases_Date DEFAULT (SYSUTCDATETIME()),
    TotalAmount DECIMAL(18,2),
    CONSTRAINT FK_Purchases_Suppliers FOREIGN KEY (SupplierId) REFERENCES Suppliers(Id)
);

CREATE TABLE PurchaseDetails (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    PurchaseId BIGINT NOT NULL,
    ProductId INT NOT NULL,
    Qty INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Total DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_PurchaseDetails_Purchases FOREIGN KEY (PurchaseId) REFERENCES Purchases(Id) ON DELETE CASCADE,
    CONSTRAINT FK_PurchaseDetails_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
);

-- STOCK MOVEMENTS
CREATE TABLE StockMovements (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    ProductId INT NOT NULL,
    MovementType NVARCHAR(20) NOT NULL,
    Qty INT NOT NULL,
    ReferenceNumber NVARCHAR(50),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_StockMovements_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_StockMovements_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
);

-- EXPENSES
CREATE TABLE Expenses (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    ExpenseName NVARCHAR(100),
    Amount DECIMAL(18,2),
    ExpenseDate DATETIME2 NOT NULL CONSTRAINT DF_Expenses_Date DEFAULT (SYSUTCDATETIME()),
    Notes NVARCHAR(255)
);

-- TAXES (master pajak: PPN, service charge, dll.)
CREATE TABLE Taxes (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TaxCode NVARCHAR(20) NOT NULL,
    TaxName NVARCHAR(100) NOT NULL,
    TaxType NVARCHAR(30) NOT NULL,
    TaxRate DECIMAL(5,2) NOT NULL CONSTRAINT DF_Taxes_Rate DEFAULT (0),
    IsInclusive BIT NOT NULL CONSTRAINT DF_Taxes_Inclusive DEFAULT (0),
    IsDefault BIT NOT NULL CONSTRAINT DF_Taxes_Default DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_Taxes_Active DEFAULT (1),
    Description NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Taxes_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Taxes_Code UNIQUE (TaxCode)
);

-- VOUCHERS
CREATE TABLE Vouchers (
    Id INT PRIMARY KEY IDENTITY(1,1),
    VoucherCode NVARCHAR(50) NOT NULL UNIQUE,
    DiscountAmount DECIMAL(18,2),
    ExpiredDate DATETIME2,
    IsActive BIT NOT NULL CONSTRAINT DF_Vouchers_IsActive DEFAULT (1)
);

-- PERMISSIONS
CREATE TABLE Permissions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    PermissionName NVARCHAR(100) NOT NULL
);

CREATE TABLE RolePermissions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    RoleId INT NOT NULL,
    PermissionId INT NOT NULL,
    CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id),
    CONSTRAINT FK_RolePermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES Permissions(Id)
);

-- CASH & BANK
CREATE TABLE CashAccounts (
    Id INT PRIMARY KEY IDENTITY(1,1),
    AccountCode NVARCHAR(50) NOT NULL,
    AccountName NVARCHAR(100) NOT NULL,
    AccountNumber NVARCHAR(50) NULL,
    AccountType NVARCHAR(20) NOT NULL,
    BankName NVARCHAR(100) NULL,
    OpeningBalance DECIMAL(18,2) NOT NULL CONSTRAINT DF_CA_Opening DEFAULT (0),
    CurrentBalance DECIMAL(18,2) NOT NULL CONSTRAINT DF_CA_Current DEFAULT (0),
    OutletId INT NULL,
    IsDefault BIT NOT NULL CONSTRAINT DF_CA_IsDefault DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_CA_IsActive DEFAULT (1),
    Notes NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CA_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_CashAccounts_Code UNIQUE (AccountCode),
    CONSTRAINT FK_CashAccounts_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id)
);

CREATE TABLE CashTransactions (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    CashAccountId INT NOT NULL,
    TransactionType NVARCHAR(10) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    TransactionDate DATETIME2 NOT NULL CONSTRAINT DF_CT_Date DEFAULT (SYSUTCDATETIME()),
    ReferenceNumber NVARCHAR(50) NULL,
    Description NVARCHAR(255) NULL,
    UserId INT NULL,
    OutletId INT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CT_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_CT_Accounts FOREIGN KEY (CashAccountId) REFERENCES CashAccounts(Id),
    CONSTRAINT FK_CT_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_CT_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id)
);

-- CASHIER SHIFTS
CREATE TABLE CashierShifts (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    OpenTime DATETIME2 NOT NULL,
    CloseTime DATETIME2 NULL,
    OpeningCash DECIMAL(18,2),
    ClosingCash DECIMAL(18,2),
    CONSTRAINT FK_CashierShifts_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);

-- AUDIT LOGS
CREATE TABLE AuditLogs (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    UserId INT,
    Action NVARCHAR(255),
    TableName NVARCHAR(100),
    RecordId BIGINT,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AuditLogs_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);
GO

-- INDEXES
CREATE INDEX IX_Products_CategoryId ON Products(CategoryId);
CREATE INDEX IX_Products_Barcode ON Products(Barcode);
CREATE INDEX IX_SalesTransactions_Date ON SalesTransactions(TransactionDate);
CREATE INDEX IX_SalesTransactions_Outlet ON SalesTransactions(OutletId);
CREATE INDEX IX_SalesDetails_SalesId ON SalesTransactionDetails(SalesTransactionId);
CREATE INDEX IX_SalesDetails_ProductId ON SalesTransactionDetails(ProductId);
CREATE INDEX IX_CHP_CustomerId ON CustomerHutangPiutang(CustomerId);
CREATE INDEX IX_CHP_Type ON CustomerHutangPiutang(Type);
CREATE INDEX IX_CHP_Status ON CustomerHutangPiutang(Status);
CREATE INDEX IX_CHP_RecordDate ON CustomerHutangPiutang(RecordDate);
CREATE INDEX IX_HeldTransactions_Status ON HeldTransactions(Status);
CREATE INDEX IX_HeldTransactions_HeldAt ON HeldTransactions(HeldAt);
CREATE INDEX IX_HeldDetails_HeldId ON HeldTransactionDetails(HeldTransactionId);
CREATE INDEX IX_Refunds_SalesId ON Refunds(SalesTransactionId);
CREATE INDEX IX_Refunds_Date ON Refunds(RefundDate);
CREATE INDEX IX_RefundDetails_RefundId ON RefundDetails(RefundId);
CREATE INDEX IX_StockMovements_ProductId ON StockMovements(ProductId);
CREATE INDEX IX_CashAccounts_Type ON CashAccounts(AccountType);
CREATE INDEX IX_CashAccounts_Outlet ON CashAccounts(OutletId);
CREATE INDEX IX_CashTransactions_Account ON CashTransactions(CashAccountId);
CREATE INDEX IX_CashTransactions_Date ON CashTransactions(TransactionDate);
CREATE INDEX IX_Taxes_Type ON Taxes(TaxType);
CREATE INDEX IX_Taxes_Active ON Taxes(IsActive);
GO

-- SEED DATA
INSERT INTO Roles (RoleName) VALUES ('Admin'), ('Cashier'), ('Supervisor'), ('Owner');

INSERT INTO Users (FullName, Username, PasswordHash, RoleId) VALUES
('Aji Prakosa', 'aji', 'hashed_password', 1),
('Kasir Utama', 'kasir1', 'hashed_password', 2),
('Supervisor Toko', 'supervisor1', 'hashed_password', 3);

INSERT INTO Outlets (OutletName, Address, PhoneNumber) VALUES
('Outlet Semarang', 'Telaga Mas Raya Semarang', '08123456789'),
('Outlet Jakarta', 'Jl. Sudirman No. 10', '08129876543');

INSERT INTO Categories (CategoryName) VALUES ('Minuman'), ('Makanan'), ('Snack');

INSERT INTO Products (CategoryId, ProductCode, ProductName, Barcode, PurchasePrice, SellingPrice, Stock, Unit) VALUES
(1, 'PRD001', 'Teh Botol', '899100210001', 3000, 5000, 100, 'Botol'),
(2, 'PRD002', 'Nasi Goreng', '899100210002', 12000, 18000, 50, 'Porsi'),
(1, 'PRD003', 'Kopi Susu', '899100210003', 8000, 15000, 8, 'Cup'),
(1, 'PRD004', 'Teh Manis', '899100210004', 2000, 4000, 5, 'Gelas'),
(3, 'PRD005', 'Snack Pack', '899100210005', 5000, 8000, 3, 'Pack'),
(2, 'PRD006', 'Mie Goreng', '899100210006', 10000, 16000, 40, 'Porsi');

INSERT INTO Suppliers (SupplierName, Address, PhoneNumber, Email) VALUES
('PT Sumber Pangan', 'Jakarta', '0811111111', 'supplier@email.com');

INSERT INTO Customers (CustomerName, PhoneNumber, Address, LoyaltyPoint) VALUES
('Budi Santoso', '081234567890', 'Semarang', 120),
('Ani Wijaya', '081987654321', 'Jakarta', 80),
('Walk-in Customer', NULL, NULL, 0);

INSERT INTO Permissions (PermissionName) VALUES
('sales.create'), ('sales.view'), ('product.manage'), ('report.view');

INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (1,1),(1,2),(1,3),(1,4),(2,1),(2,2);

INSERT INTO Vouchers (VoucherCode, DiscountAmount, ExpiredDate, IsActive) VALUES
('DISKON10', 10000, DATEADD(MONTH, 1, SYSUTCDATETIME()), 1);

INSERT INTO Expenses (ExpenseName, Amount, ExpenseDate, Notes) VALUES
('Listrik', 500000, SYSUTCDATETIME(), 'Bulan ini'),
('Gaji Karyawan', 3500000, SYSUTCDATETIME(), 'Kasir');

INSERT INTO Taxes (TaxCode, TaxName, TaxType, TaxRate, IsInclusive, IsDefault, IsActive, Description) VALUES
('PPN-11', 'PPN 11%', 'PPN', 11, 0, 1, 1, 'Pajak Pertambahan Nilai standar'),
('SVC-10', 'Service Charge 10%', 'SERVICE_CHARGE', 10, 0, 0, 1, 'Biaya layanan restoran/cafe');

-- Sales sample (today + last 7 days)
DECLARE @i INT = 0;
WHILE @i < 8
BEGIN
    INSERT INTO SalesTransactions (InvoiceNumber, TransactionDate, CustomerId, UserId, OutletId, SubTotal, Discount, Tax, GrandTotal, PaymentMethod, PaidAmount, ChangeAmount)
    VALUES (
        CONCAT('INV-', FORMAT(DATEADD(DAY, -@i, SYSUTCDATETIME()), 'yyyyMMdd'), '-', RIGHT('00' + CAST(@i+1 AS VARCHAR), 3)),
        DATEADD(HOUR, -@i * 3, SYSUTCDATETIME()),
        CASE WHEN @i % 2 = 0 THEN 1 ELSE 2 END,
        2, 1,
        20000 + (@i * 5000), 0, 2000 + (@i * 500), 22000 + (@i * 5500),
        CASE WHEN @i % 3 = 0 THEN 'Cash' ELSE 'QRIS' END,
        30000, 8000 - (@i * 500)
    );
    SET @i = @i + 1;
END;

INSERT INTO SalesTransactionDetails (SalesTransactionId, ProductId, Qty, Price, Discount, Total) VALUES
(1, 1, 2, 5000, 0, 10000),
(1, 2, 1, 18000, 0, 18000),
(2, 3, 3, 15000, 0, 45000),
(2, 4, 2, 4000, 0, 8000),
(3, 1, 5, 5000, 0, 25000),
(3, 6, 2, 16000, 0, 32000),
(4, 2, 2, 18000, 0, 36000),
(5, 3, 4, 15000, 0, 60000),
(6, 5, 3, 8000, 0, 24000),
(7, 1, 10, 5000, 0, 50000),
(8, 2, 3, 18000, 0, 54000);

INSERT INTO StockMovements (ProductId, MovementType, Qty, ReferenceNumber) VALUES
(1, 'IN', 100, 'PO-001'),
(2, 'OUT', 5, 'INV-20260526-001');

INSERT INTO CashierShifts (UserId, OpenTime, OpeningCash, ClosingCash) VALUES
(2, DATEADD(HOUR, -8, SYSUTCDATETIME()), 500000, NULL);

INSERT INTO CashAccounts (AccountCode, AccountName, AccountNumber, AccountType, BankName, OpeningBalance, CurrentBalance, OutletId, IsDefault, IsActive, Notes) VALUES
('KAS-01', 'Kas Utama', NULL, 'Cash', NULL, 5000000, 5000000, 1, 1, 1, 'Kas operasional harian'),
('BNK-01', 'BCA Outlet Semarang', '1234567890', 'Bank', 'BCA', 15000000, 15000000, 1, 0, 1, 'Rekening penjualan QRIS & transfer');

PRINT 'LatihanASP_POS schema and seed data created successfully.';
GO
