-- Migration: CashAccounts & CashTransactions (Kas & Bank)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.CashTransactions', N'U') IS NOT NULL DROP TABLE dbo.CashTransactions;
IF OBJECT_ID(N'dbo.CashAccounts', N'U') IS NOT NULL DROP TABLE dbo.CashAccounts;
GO

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
GO

CREATE INDEX IX_CashAccounts_Type ON CashAccounts(AccountType);
CREATE INDEX IX_CashAccounts_Outlet ON CashAccounts(OutletId);
CREATE INDEX IX_CashTransactions_Account ON CashTransactions(CashAccountId);
CREATE INDEX IX_CashTransactions_Date ON CashTransactions(TransactionDate);
GO

INSERT INTO CashAccounts (AccountCode, AccountName, AccountNumber, AccountType, BankName, OpeningBalance, CurrentBalance, OutletId, IsDefault, IsActive, Notes)
SELECT 'KAS-01', 'Kas Utama', NULL, 'Cash', NULL, 5000000, 5000000, 1, 1, 1, 'Kas operasional harian'
WHERE NOT EXISTS (SELECT 1 FROM CashAccounts WHERE AccountCode = 'KAS-01');

INSERT INTO CashAccounts (AccountCode, AccountName, AccountNumber, AccountType, BankName, OpeningBalance, CurrentBalance, OutletId, IsDefault, IsActive, Notes)
SELECT 'BNK-01', 'BCA Outlet Semarang', '1234567890', 'Bank', 'BCA', 15000000, 15000000, 1, 0, 1, 'Rekening penjualan QRIS & transfer'
WHERE NOT EXISTS (SELECT 1 FROM CashAccounts WHERE AccountCode = 'BNK-01');
GO

PRINT 'CashAccounts & CashTransactions tables created.';
GO
