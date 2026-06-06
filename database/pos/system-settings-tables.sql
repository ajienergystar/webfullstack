-- Migration: SystemSettings (pengaturan umum POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.SystemSettings', N'U') IS NULL
BEGIN
    CREATE TABLE SystemSettings (
        Id INT PRIMARY KEY IDENTITY(1,1),
        CompanyName NVARCHAR(150) NOT NULL,
        Tagline NVARCHAR(255) NULL,
        Address NVARCHAR(500) NULL,
        PhoneNumber NVARCHAR(20) NULL,
        Email NVARCHAR(100) NULL,
        Website NVARCHAR(150) NULL,
        TaxId NVARCHAR(50) NULL,
        CurrencyCode NVARCHAR(3) NOT NULL CONSTRAINT DF_SystemSettings_Currency DEFAULT ('IDR'),
        CurrencySymbol NVARCHAR(10) NOT NULL CONSTRAINT DF_SystemSettings_Symbol DEFAULT ('Rp'),
        Timezone NVARCHAR(50) NOT NULL CONSTRAINT DF_SystemSettings_Timezone DEFAULT ('Asia/Jakarta'),
        DateFormat NVARCHAR(20) NOT NULL CONSTRAINT DF_SystemSettings_DateFormat DEFAULT ('DD/MM/YYYY'),
        DefaultOutletId INT NULL,
        InvoicePrefix NVARCHAR(10) NOT NULL CONSTRAINT DF_SystemSettings_InvoicePrefix DEFAULT ('INV'),
        ReceiptHeader NVARCHAR(255) NULL,
        ReceiptFooter NVARCHAR(255) NULL,
        LogoUrl NVARCHAR(500) NULL,
        LowStockThreshold INT NOT NULL CONSTRAINT DF_SystemSettings_LowStock DEFAULT (10),
        EnableLoyalty BIT NOT NULL CONSTRAINT DF_SystemSettings_Loyalty DEFAULT (1),
        EnableTax BIT NOT NULL CONSTRAINT DF_SystemSettings_Tax DEFAULT (1),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_SystemSettings_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId INT NULL,
        CONSTRAINT FK_SystemSettings_Outlets FOREIGN KEY (DefaultOutletId) REFERENCES Outlets(Id),
        CONSTRAINT FK_SystemSettings_Users FOREIGN KEY (UpdatedByUserId) REFERENCES Users(Id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM SystemSettings)
BEGIN
    INSERT INTO SystemSettings (
        CompanyName, Tagline, Address, PhoneNumber, Email, Website, TaxId,
        CurrencyCode, CurrencySymbol, Timezone, DateFormat, DefaultOutletId,
        InvoicePrefix, ReceiptHeader, ReceiptFooter, LowStockThreshold, EnableLoyalty, EnableTax
    ) VALUES (
        'LatihanASP POS',
        'Point of Sale untuk Retail & F&B',
        'Telaga Mas Raya Semarang',
        '08123456789',
        'info@latihanasp.com',
        'https://latihanasp.com',
        NULL,
        'IDR', 'Rp', 'Asia/Jakarta', 'DD/MM/YYYY', 1,
        'INV',
        'Terima kasih atas kunjungan Anda',
        'Barang yang sudah dibeli tidak dapat ditukar/dikembalikan',
        10, 1, 1
    );
END
GO

PRINT 'SystemSettings table ready.';
GO
