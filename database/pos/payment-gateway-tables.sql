-- Migration: PaymentGateways (konfigurasi payment gateway POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.PaymentGateways', N'U') IS NULL
BEGIN
    CREATE TABLE PaymentGateways (
        Id INT PRIMARY KEY IDENTITY(1,1),
        GatewayName NVARCHAR(100) NOT NULL,
        Provider NVARCHAR(50) NOT NULL,
        MerchantId NVARCHAR(100) NULL,
        ClientKey NVARCHAR(255) NULL,
        ServerKey NVARCHAR(255) NULL,
        Environment NVARCHAR(20) NOT NULL CONSTRAINT DF_PaymentGateways_Environment DEFAULT ('Sandbox'),
        SupportedMethods NVARCHAR(200) NULL,
        CallbackUrl NVARCHAR(500) NULL,
        OutletId INT NULL,
        IsDefault BIT NOT NULL CONSTRAINT DF_PaymentGateways_IsDefault DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_PaymentGateways_IsActive DEFAULT (1),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PaymentGateways_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT FK_PaymentGateways_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id),
        CONSTRAINT CK_PaymentGateways_Provider CHECK (Provider IN ('Midtrans', 'Xendit', 'Doku', 'Stripe', 'Manual')),
        CONSTRAINT CK_PaymentGateways_Environment CHECK (Environment IN ('Sandbox', 'Production'))
    );
    CREATE INDEX IX_PaymentGateways_OutletId ON PaymentGateways(OutletId);
    CREATE INDEX IX_PaymentGateways_IsActive ON PaymentGateways(IsActive);
    CREATE INDEX IX_PaymentGateways_Provider ON PaymentGateways(Provider);
END
GO

IF NOT EXISTS (SELECT 1 FROM PaymentGateways)
BEGIN
    INSERT INTO PaymentGateways (
        GatewayName, Provider, MerchantId, ClientKey, ServerKey,
        Environment, SupportedMethods, CallbackUrl, OutletId, IsDefault, IsActive
    ) VALUES
    (
        'Midtrans QRIS & EDC',
        'Midtrans',
        'G123456789',
        'SB-Mid-client-xxxxxxxx',
        'SB-Mid-server-xxxxxxxx',
        'Sandbox',
        'QRIS,Transfer,Debit,Credit',
        'https://latihanasp.com/api/payments/midtrans/callback',
        1,
        1,
        1
    ),
    (
        'Xendit Virtual Account',
        'Xendit',
        NULL,
        'xnd_public_development_xxxxxxxx',
        'xnd_development_xxxxxxxx',
        'Sandbox',
        'Transfer',
        NULL,
        NULL,
        0,
        0
    );
END
GO

PRINT 'PaymentGateways table ready.';
GO
