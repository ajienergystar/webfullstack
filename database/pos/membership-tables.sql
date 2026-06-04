-- Migration: Memberships (run on existing LatihanASP_POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.Memberships', N'U') IS NOT NULL DROP TABLE dbo.Memberships;
GO

CREATE TABLE Memberships (
    Id INT PRIMARY KEY IDENTITY(1,1),
    CustomerId INT NOT NULL,
    MemberCode NVARCHAR(50) NOT NULL,
    MemberLevel NVARCHAR(50) NOT NULL,
    JoinDate DATETIME2 NOT NULL CONSTRAINT DF_Memberships_JoinDate DEFAULT (SYSUTCDATETIME()),
    ExpiredDate DATETIME2 NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Memberships_IsActive DEFAULT (1),
    Notes NVARCHAR(255) NULL,
    CONSTRAINT UQ_Memberships_Customer UNIQUE (CustomerId),
    CONSTRAINT UQ_Memberships_MemberCode UNIQUE (MemberCode),
    CONSTRAINT FK_Memberships_Customers FOREIGN KEY (CustomerId) REFERENCES Customers(Id)
);
GO

CREATE INDEX IX_Memberships_CustomerId ON Memberships(CustomerId);
CREATE INDEX IX_Memberships_MemberLevel ON Memberships(MemberLevel);
GO

INSERT INTO Memberships (CustomerId, MemberCode, MemberLevel, JoinDate, ExpiredDate, IsActive, Notes)
SELECT 1, 'MEM-00001', 'Gold', DATEADD(MONTH, -6, SYSUTCDATETIME()), DATEADD(YEAR, 1, SYSUTCDATETIME()), 1, 'Member loyal Semarang'
WHERE EXISTS (SELECT 1 FROM Customers WHERE Id = 1)
  AND NOT EXISTS (SELECT 1 FROM Memberships WHERE CustomerId = 1);

INSERT INTO Memberships (CustomerId, MemberCode, MemberLevel, JoinDate, ExpiredDate, IsActive, Notes)
SELECT 2, 'MEM-00002', 'Silver', DATEADD(MONTH, -3, SYSUTCDATETIME()), DATEADD(YEAR, 1, SYSUTCDATETIME()), 1, NULL
WHERE EXISTS (SELECT 1 FROM Customers WHERE Id = 2)
  AND NOT EXISTS (SELECT 1 FROM Memberships WHERE CustomerId = 2);
GO

PRINT 'Memberships table created.';
GO
