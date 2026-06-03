-- Migration: Refunds tables (run on existing LatihanASP_POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.RefundDetails', N'U') IS NOT NULL DROP TABLE dbo.RefundDetails;
IF OBJECT_ID(N'dbo.Refunds', N'U') IS NOT NULL DROP TABLE dbo.Refunds;
GO

CREATE TABLE Refunds (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    RefundNumber NVARCHAR(50) NOT NULL,
    RefundDate DATETIME2 NOT NULL CONSTRAINT DF_Refunds_Date DEFAULT (SYSUTCDATETIME()),
    SalesTransactionId BIGINT NOT NULL,
    UserId INT NOT NULL,
    OutletId INT NOT NULL,
    SubTotal DECIMAL(18,2) NOT NULL,
    TotalRefund DECIMAL(18,2) NOT NULL,
    Reason NVARCHAR(255) NULL,
    RefundMethod NVARCHAR(50) NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Refunds_Status DEFAULT ('COMPLETED'),
    CONSTRAINT FK_Refunds_Sales FOREIGN KEY (SalesTransactionId) REFERENCES SalesTransactions(Id),
    CONSTRAINT FK_Refunds_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_Refunds_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id)
);

CREATE TABLE RefundDetails (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    RefundId BIGINT NOT NULL,
    SalesTransactionDetailId BIGINT NOT NULL,
    ProductId INT NOT NULL,
    Qty INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Total DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_POS_RefundDetails_Refunds FOREIGN KEY (RefundId) REFERENCES Refunds(Id) ON DELETE CASCADE,
    CONSTRAINT FK_POS_RefundDetails_SalesDetail FOREIGN KEY (SalesTransactionDetailId) REFERENCES SalesTransactionDetails(Id),
    CONSTRAINT FK_POS_RefundDetails_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
);

CREATE INDEX IX_Refunds_SalesId ON Refunds(SalesTransactionId);
CREATE INDEX IX_Refunds_Date ON Refunds(RefundDate);
CREATE INDEX IX_RefundDetails_RefundId ON RefundDetails(RefundId);
GO

PRINT 'Refunds tables created.';
GO
