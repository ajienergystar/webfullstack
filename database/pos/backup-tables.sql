-- Migration: DatabaseBackups (riwayat backup & restore POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.DatabaseBackups', N'U') IS NULL
BEGIN
    CREATE TABLE DatabaseBackups (
        Id INT PRIMARY KEY IDENTITY(1,1),
        FileName NVARCHAR(255) NOT NULL,
        FilePath NVARCHAR(500) NOT NULL,
        FileSizeBytes BIGINT NOT NULL,
        BackupType NVARCHAR(20) NOT NULL CONSTRAINT DF_DatabaseBackups_Type DEFAULT ('Manual'),
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_DatabaseBackups_Status DEFAULT ('Completed'),
        Notes NVARCHAR(500) NULL,
        CreatedByUserId INT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DatabaseBackups_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_DatabaseBackups_Users FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id),
        CONSTRAINT CK_DatabaseBackups_Type CHECK (BackupType IN ('Manual', 'Scheduled', 'Auto')),
        CONSTRAINT CK_DatabaseBackups_Status CHECK (Status IN ('Completed', 'Failed', 'InProgress', 'Restored'))
    );
    CREATE INDEX IX_DatabaseBackups_CreatedAt ON DatabaseBackups(CreatedAt DESC);
    CREATE INDEX IX_DatabaseBackups_Status ON DatabaseBackups(Status);
END
GO

PRINT 'DatabaseBackups table ready.';
GO
