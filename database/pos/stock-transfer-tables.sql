-- Stock transfer tables (multi outlet) — jalankan jika init.sql sudah pernah dijalankan
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.StockTransfers', N'U') IS NULL
BEGIN
    CREATE TABLE StockTransfers (
        Id BIGINT PRIMARY KEY IDENTITY(1,1),
        ReferenceNumber NVARCHAR(50) NOT NULL,
        FromOutletId INT NOT NULL,
        ToOutletId INT NOT NULL,
        TransferDate DATETIME2 NOT NULL CONSTRAINT DF_StockTransfers_Date DEFAULT (SYSUTCDATETIME()),
        Notes NVARCHAR(255) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_StockTransfers_Status DEFAULT ('Completed'),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_StockTransfers_Created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_StockTransfers_FromOutlet FOREIGN KEY (FromOutletId) REFERENCES Outlets(Id),
        CONSTRAINT FK_StockTransfers_ToOutlet FOREIGN KEY (ToOutletId) REFERENCES Outlets(Id),
        CONSTRAINT CK_StockTransfers_DifferentOutlets CHECK (FromOutletId <> ToOutletId),
        CONSTRAINT UQ_StockTransfers_Reference UNIQUE (ReferenceNumber)
    );
    CREATE INDEX IX_StockTransfers_FromOutlet ON StockTransfers(FromOutletId);
    CREATE INDEX IX_StockTransfers_ToOutlet ON StockTransfers(ToOutletId);
    CREATE INDEX IX_StockTransfers_Date ON StockTransfers(TransferDate);
    PRINT 'StockTransfers created.';
END
GO

IF OBJECT_ID(N'dbo.StockTransferDetails', N'U') IS NULL
BEGIN
    CREATE TABLE StockTransferDetails (
        Id BIGINT PRIMARY KEY IDENTITY(1,1),
        TransferId BIGINT NOT NULL,
        ProductId INT NOT NULL,
        Qty INT NOT NULL,
        CONSTRAINT FK_StockTransferDetails_Transfer FOREIGN KEY (TransferId) REFERENCES StockTransfers(Id) ON DELETE CASCADE,
        CONSTRAINT FK_StockTransferDetails_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
    );
    CREATE INDEX IX_StockTransferDetails_Transfer ON StockTransferDetails(TransferId);
    PRINT 'StockTransferDetails created.';
END
GO
