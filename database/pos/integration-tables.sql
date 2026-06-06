-- Migration: ExternalIntegrations (konfigurasi integrasi layanan eksternal POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.ExternalIntegrations', N'U') IS NULL
BEGIN
    CREATE TABLE ExternalIntegrations (
        Id INT PRIMARY KEY IDENTITY(1,1),
        IntegrationName NVARCHAR(100) NOT NULL,
        IntegrationType NVARCHAR(50) NOT NULL,
        Provider NVARCHAR(50) NOT NULL,
        ApiKey NVARCHAR(255) NULL,
        ApiSecret NVARCHAR(255) NULL,
        WebhookUrl NVARCHAR(500) NULL,
        BaseUrl NVARCHAR(500) NULL,
        SyncDirection NVARCHAR(20) NOT NULL CONSTRAINT DF_ExternalIntegrations_SyncDirection DEFAULT ('Bidirectional'),
        LastSyncAt DATETIME2 NULL,
        LastSyncStatus NVARCHAR(20) NULL,
        Notes NVARCHAR(500) NULL,
        OutletId INT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ExternalIntegrations_IsActive DEFAULT (1),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ExternalIntegrations_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT FK_ExternalIntegrations_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id),
        CONSTRAINT CK_ExternalIntegrations_Type CHECK (IntegrationType IN ('Accounting', 'Marketplace', 'Messaging', 'ECommerce', 'Webhook')),
        CONSTRAINT CK_ExternalIntegrations_SyncDirection CHECK (SyncDirection IN ('Inbound', 'Outbound', 'Bidirectional')),
        CONSTRAINT CK_ExternalIntegrations_SyncStatus CHECK (LastSyncStatus IS NULL OR LastSyncStatus IN ('Success', 'Failed', 'Pending', 'Never'))
    );
    CREATE INDEX IX_ExternalIntegrations_OutletId ON ExternalIntegrations(OutletId);
    CREATE INDEX IX_ExternalIntegrations_IsActive ON ExternalIntegrations(IsActive);
    CREATE INDEX IX_ExternalIntegrations_Type ON ExternalIntegrations(IntegrationType);
    CREATE INDEX IX_ExternalIntegrations_Provider ON ExternalIntegrations(Provider);
END
GO

IF NOT EXISTS (SELECT 1 FROM ExternalIntegrations)
BEGIN
    INSERT INTO ExternalIntegrations (
        IntegrationName, IntegrationType, Provider, ApiKey, ApiSecret,
        WebhookUrl, BaseUrl, SyncDirection, LastSyncAt, LastSyncStatus,
        Notes, OutletId, IsActive
    ) VALUES
    (
        'Jurnal.id Akuntansi',
        'Accounting',
        'Jurnal',
        'jurnal_api_key_xxxxxxxx',
        'jurnal_secret_xxxxxxxx',
        'https://latihanasp.com/api/integrations/jurnal/webhook',
        'https://api.jurnal.id',
        'Bidirectional',
        DATEADD(HOUR, -2, SYSUTCDATETIME()),
        'Success',
        'Sinkronisasi penjualan harian ke Jurnal',
        1,
        1
    ),
    (
        'Shopee Marketplace',
        'Marketplace',
        'Shopee',
        'shopee_partner_id_xxxxxxxx',
        'shopee_partner_key_xxxxxxxx',
        NULL,
        'https://partner.shopeemobile.com',
        'Inbound',
        NULL,
        'Never',
        'Import pesanan dari Shopee',
        NULL,
        0
    ),
    (
        'WhatsApp Business Notifikasi',
        'Messaging',
        'WhatsApp',
        'wa_business_token_xxxxxxxx',
        NULL,
        'https://latihanasp.com/api/integrations/whatsapp/webhook',
        'https://graph.facebook.com',
        'Outbound',
        DATEADD(DAY, -1, SYSUTCDATETIME()),
        'Failed',
        'Kirim struk digital ke pelanggan',
        NULL,
        1
    );
END
GO

PRINT 'ExternalIntegrations table ready.';
GO
