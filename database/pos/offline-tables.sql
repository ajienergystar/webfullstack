-- Migration: Offline Mode tables (run on existing LatihanASP_POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.OfflineSyncLogs', N'U') IS NOT NULL DROP TABLE dbo.OfflineSyncLogs;
IF OBJECT_ID(N'dbo.OfflineSyncQueue', N'U') IS NOT NULL DROP TABLE dbo.OfflineSyncQueue;
IF OBJECT_ID(N'dbo.OfflineDevices', N'U') IS NOT NULL DROP TABLE dbo.OfflineDevices;
GO

CREATE TABLE OfflineDevices (
    Id INT PRIMARY KEY IDENTITY(1,1),
    DeviceCode NVARCHAR(50) NOT NULL,
    DeviceName NVARCHAR(100) NOT NULL,
    OutletId INT NOT NULL,
    AssignedUserId INT NULL,
    IsOfflineEnabled BIT NOT NULL CONSTRAINT DF_OfflineDevices_Enabled DEFAULT (0),
    IsOnline BIT NOT NULL CONSTRAINT DF_OfflineDevices_Online DEFAULT (1),
    LastOnlineAt DATETIME2 NULL,
    LastSyncAt DATETIME2 NULL,
    LastSyncStatus NVARCHAR(20) NULL,
    CachedProductsAt DATETIME2 NULL,
    CachedCustomersAt DATETIME2 NULL,
    CachedCategoriesAt DATETIME2 NULL,
    PendingSyncCount INT NOT NULL CONSTRAINT DF_OfflineDevices_Pending DEFAULT (0),
    Notes NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_OfflineDevices_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT FK_OfflineDevices_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id),
    CONSTRAINT FK_OfflineDevices_Users FOREIGN KEY (AssignedUserId) REFERENCES Users(Id),
    CONSTRAINT UQ_OfflineDevices_DeviceCode UNIQUE (DeviceCode),
    CONSTRAINT CK_OfflineDevices_SyncStatus CHECK (LastSyncStatus IS NULL OR LastSyncStatus IN ('Success', 'Failed', 'Pending', 'Never'))
);

CREATE TABLE OfflineSyncQueue (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    DeviceId INT NOT NULL,
    QueueNumber NVARCHAR(50) NOT NULL,
    RecordType NVARCHAR(30) NOT NULL,
    ReferenceLabel NVARCHAR(100) NULL,
    GrandTotal DECIMAL(18,2) NULL,
    LocalCreatedAt DATETIME2 NOT NULL,
    SyncStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_OfflineSyncQueue_Status DEFAULT ('Pending'),
    SyncedAt DATETIME2 NULL,
    SyncedRecordId BIGINT NULL,
    ErrorMessage NVARCHAR(500) NULL,
    RetryCount INT NOT NULL CONSTRAINT DF_OfflineSyncQueue_Retry DEFAULT (0),
    CONSTRAINT FK_OfflineSyncQueue_Devices FOREIGN KEY (DeviceId) REFERENCES OfflineDevices(Id),
    CONSTRAINT CK_OfflineSyncQueue_RecordType CHECK (RecordType IN ('Sale', 'Refund', 'Hold', 'StockAdjustment')),
    CONSTRAINT CK_OfflineSyncQueue_Status CHECK (SyncStatus IN ('Pending', 'Syncing', 'Synced', 'Failed'))
);

CREATE TABLE OfflineSyncLogs (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    DeviceId INT NOT NULL,
    SyncType NVARCHAR(30) NOT NULL,
    Direction NVARCHAR(20) NOT NULL,
    RecordsProcessed INT NOT NULL CONSTRAINT DF_OfflineSyncLogs_Processed DEFAULT (0),
    RecordsFailed INT NOT NULL CONSTRAINT DF_OfflineSyncLogs_Failed DEFAULT (0),
    Status NVARCHAR(20) NOT NULL,
    StartedAt DATETIME2 NOT NULL,
    CompletedAt DATETIME2 NULL,
    Notes NVARCHAR(500) NULL,
    CONSTRAINT FK_OfflineSyncLogs_Devices FOREIGN KEY (DeviceId) REFERENCES OfflineDevices(Id),
    CONSTRAINT CK_OfflineSyncLogs_Type CHECK (SyncType IN ('FullDownload', 'IncrementalDownload', 'UploadQueue', 'AutoSync')),
    CONSTRAINT CK_OfflineSyncLogs_Direction CHECK (Direction IN ('Download', 'Upload')),
    CONSTRAINT CK_OfflineSyncLogs_Status CHECK (Status IN ('Success', 'Failed', 'Partial'))
);

CREATE INDEX IX_OfflineDevices_OutletId ON OfflineDevices(OutletId);
CREATE INDEX IX_OfflineDevices_IsOfflineEnabled ON OfflineDevices(IsOfflineEnabled);
CREATE INDEX IX_OfflineSyncQueue_DeviceId ON OfflineSyncQueue(DeviceId);
CREATE INDEX IX_OfflineSyncQueue_SyncStatus ON OfflineSyncQueue(SyncStatus);
CREATE INDEX IX_OfflineSyncQueue_LocalCreatedAt ON OfflineSyncQueue(LocalCreatedAt);
CREATE INDEX IX_OfflineSyncLogs_DeviceId ON OfflineSyncLogs(DeviceId);
CREATE INDEX IX_OfflineSyncLogs_StartedAt ON OfflineSyncLogs(StartedAt);
GO

INSERT INTO OfflineDevices (
    DeviceCode, DeviceName, OutletId, AssignedUserId,
    IsOfflineEnabled, IsOnline, LastOnlineAt, LastSyncAt, LastSyncStatus,
    CachedProductsAt, CachedCustomersAt, CachedCategoriesAt, PendingSyncCount, Notes
) VALUES
(
    'KSR-SMG-01', 'Kasir Utama Semarang', 1, 2,
    1, 1, SYSUTCDATETIME(), DATEADD(MINUTE, -15, SYSUTCDATETIME()), 'Success',
    DATEADD(HOUR, -1, SYSUTCDATETIME()), DATEADD(HOUR, -1, SYSUTCDATETIME()), DATEADD(HOUR, -1, SYSUTCDATETIME()),
    2, 'Terminal kasir utama outlet Semarang'
),
(
    'KSR-JKT-01', 'Kasir Jakarta Pusat', 2, 2,
    1, 0, DATEADD(HOUR, -3, SYSUTCDATETIME()), DATEADD(HOUR, -4, SYSUTCDATETIME()), 'Failed',
    DATEADD(DAY, -1, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), NULL,
    1, 'Koneksi internet tidak stabil'
),
(
    'KSR-SMG-02', 'Kasir Cadangan Semarang', 1, 3,
    0, 1, SYSUTCDATETIME(), NULL, 'Never',
    NULL, NULL, NULL, 0, 'Belum diaktifkan mode offline'
);

INSERT INTO OfflineSyncQueue (
    DeviceId, QueueNumber, RecordType, ReferenceLabel, GrandTotal,
    LocalCreatedAt, SyncStatus, SyncedAt, SyncedRecordId, ErrorMessage, RetryCount
) VALUES
(1, 'OFF-20250608-001', 'Sale', 'INV-OFF-001 · 2 item', 55000, DATEADD(MINUTE, -30, SYSUTCDATETIME()), 'Pending', NULL, NULL, NULL, 0),
(1, 'OFF-20250608-002', 'Sale', 'INV-OFF-002 · 1 item', 18000, DATEADD(MINUTE, -20, SYSUTCDATETIME()), 'Pending', NULL, NULL, NULL, 0),
(2, 'OFF-20250607-003', 'Refund', 'REF-OFF-001 · Retur 1 item', 15000, DATEADD(HOUR, -5, SYSUTCDATETIME()), 'Failed', NULL, NULL, 'Koneksi terputus saat upload', 2),
(1, 'OFF-20250607-004', 'Sale', 'INV-OFF-003 · 3 item', 72000, DATEADD(HOUR, -8, SYSUTCDATETIME()), 'Synced', DATEADD(HOUR, -7, SYSUTCDATETIME()), 9, NULL, 0),
(2, 'OFF-20250606-005', 'Hold', 'HOLD-OFF-001 · Hold transaksi', 33000, DATEADD(DAY, -1, SYSUTCDATETIME()), 'Failed', NULL, NULL, 'Timeout server', 1);

INSERT INTO OfflineSyncLogs (
    DeviceId, SyncType, Direction, RecordsProcessed, RecordsFailed,
    Status, StartedAt, CompletedAt, Notes
) VALUES
(1, 'FullDownload', 'Download', 156, 0, 'Success', DATEADD(HOUR, -1, SYSUTCDATETIME()), DATEADD(MINUTE, -58, SYSUTCDATETIME()), 'Produk, kategori, pelanggan, dan stok'),
(1, 'UploadQueue', 'Upload', 1, 0, 'Success', DATEADD(HOUR, -7, SYSUTCDATETIME()), DATEADD(MINUTE, -425, SYSUTCDATETIME()), '1 transaksi penjualan berhasil diunggah'),
(2, 'UploadQueue', 'Upload', 0, 2, 'Failed', DATEADD(HOUR, -4, SYSUTCDATETIME()), DATEADD(HOUR, -4, SYSUTCDATETIME()), 'Gagal upload antrian — koneksi terputus'),
(2, 'IncrementalDownload', 'Download', 12, 0, 'Success', DATEADD(DAY, -1, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 'Update harga 12 produk'),
(1, 'AutoSync', 'Upload', 3, 0, 'Success', DATEADD(MINUTE, -15, SYSUTCDATETIME()), DATEADD(MINUTE, -14, SYSUTCDATETIME()), 'Sinkronisasi otomatis berkala'),
(3, 'FullDownload', 'Download', 0, 0, 'Partial', DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -2, SYSUTCDATETIME()), 'Perangkat belum mengaktifkan mode offline');

PRINT 'Offline Mode tables created with sample data.';
GO
