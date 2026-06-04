-- Migration: CustomerHutangPiutang (run on existing LatihanASP_POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.CustomerHutangPiutang', N'U') IS NOT NULL DROP TABLE dbo.CustomerHutangPiutang;
GO

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
GO

CREATE INDEX IX_CHP_CustomerId ON CustomerHutangPiutang(CustomerId);
CREATE INDEX IX_CHP_Type ON CustomerHutangPiutang(Type);
CREATE INDEX IX_CHP_Status ON CustomerHutangPiutang(Status);
CREATE INDEX IX_CHP_RecordDate ON CustomerHutangPiutang(RecordDate);
GO

INSERT INTO CustomerHutangPiutang (ReferenceNumber, CustomerId, Type, Amount, PaidAmount, RecordDate, DueDate, Status, Description, Notes)
SELECT 'HP-20260601-001', 1, 'PIUTANG', 500000, 200000, DATEADD(DAY, -5, SYSUTCDATETIME()), DATEADD(DAY, 25, SYSUTCDATETIME()), 'PARTIAL', 'Bon pembelian bulan ini', NULL
WHERE EXISTS (SELECT 1 FROM Customers WHERE Id = 1)
  AND NOT EXISTS (SELECT 1 FROM CustomerHutangPiutang WHERE ReferenceNumber = 'HP-20260601-001');

INSERT INTO CustomerHutangPiutang (ReferenceNumber, CustomerId, Type, Amount, PaidAmount, RecordDate, DueDate, Status, Description, Notes)
SELECT 'HP-20260602-001', 2, 'HUTANG', 100000, 0, DATEADD(DAY, -2, SYSUTCDATETIME()), NULL, 'OPEN', 'Saldo deposit retur', 'Dari retur sebagian'
WHERE EXISTS (SELECT 1 FROM Customers WHERE Id = 2)
  AND NOT EXISTS (SELECT 1 FROM CustomerHutangPiutang WHERE ReferenceNumber = 'HP-20260602-001');
GO

PRINT 'CustomerHutangPiutang table created.';
GO
