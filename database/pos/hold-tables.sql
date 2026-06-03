-- Migration: HeldTransactions tables (run on existing LatihanASP_POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.HeldTransactionDetails', N'U') IS NOT NULL DROP TABLE dbo.HeldTransactionDetails;
IF OBJECT_ID(N'dbo.HeldTransactions', N'U') IS NOT NULL DROP TABLE dbo.HeldTransactions;
GO

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

CREATE INDEX IX_HeldTransactions_Status ON HeldTransactions(Status);
CREATE INDEX IX_HeldTransactions_HeldAt ON HeldTransactions(HeldAt);
CREATE INDEX IX_HeldDetails_HeldId ON HeldTransactionDetails(HeldTransactionId);
GO

PRINT 'HeldTransactions tables created.';
GO
