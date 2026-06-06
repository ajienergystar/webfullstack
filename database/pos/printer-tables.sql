-- Migration: Printers (konfigurasi printer struk POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.Printers', N'U') IS NULL
BEGIN
    CREATE TABLE Printers (
        Id INT PRIMARY KEY IDENTITY(1,1),
        PrinterName NVARCHAR(100) NOT NULL,
        ConnectionType NVARCHAR(20) NOT NULL,
        IpAddress NVARCHAR(45) NULL,
        Port NVARCHAR(10) NULL,
        PaperWidthMm INT NOT NULL CONSTRAINT DF_Printers_PaperWidth DEFAULT (58),
        PrinterPurpose NVARCHAR(30) NOT NULL CONSTRAINT DF_Printers_Purpose DEFAULT ('Receipt'),
        OutletId INT NULL,
        IsDefault BIT NOT NULL CONSTRAINT DF_Printers_IsDefault DEFAULT (0),
        IsActive BIT NOT NULL CONSTRAINT DF_Printers_IsActive DEFAULT (1),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Printers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Printers_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id),
        CONSTRAINT CK_Printers_ConnectionType CHECK (ConnectionType IN ('USB', 'Bluetooth', 'Network')),
        CONSTRAINT CK_Printers_PaperWidth CHECK (PaperWidthMm IN (58, 80)),
        CONSTRAINT CK_Printers_Purpose CHECK (PrinterPurpose IN ('Receipt', 'Kitchen', 'Label'))
    );
    CREATE INDEX IX_Printers_OutletId ON Printers(OutletId);
    CREATE INDEX IX_Printers_IsActive ON Printers(IsActive);
END
GO

IF NOT EXISTS (SELECT 1 FROM Printers)
BEGIN
    INSERT INTO Printers (PrinterName, ConnectionType, IpAddress, Port, PaperWidthMm, PrinterPurpose, OutletId, IsDefault, IsActive) VALUES
    ('Kasir Struk 58mm', 'USB', NULL, NULL, 58, 'Receipt', 1, 1, 1),
    ('Dapur Thermal 80mm', 'Network', '192.168.1.100', '9100', 80, 'Kitchen', 1, 0, 1),
    ('Label Barcode', 'Bluetooth', NULL, NULL, 58, 'Label', NULL, 0, 1);
END
GO

PRINT 'Printers table ready.';
GO
