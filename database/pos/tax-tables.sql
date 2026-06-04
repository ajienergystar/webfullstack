-- Migration: Taxes (master pajak — PPN, service charge, dll.)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.Taxes', N'U') IS NOT NULL DROP TABLE dbo.Taxes;
GO

CREATE TABLE Taxes (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TaxCode NVARCHAR(20) NOT NULL,
    TaxName NVARCHAR(100) NOT NULL,
    TaxType NVARCHAR(30) NOT NULL,
    TaxRate DECIMAL(5,2) NOT NULL CONSTRAINT DF_Taxes_Rate DEFAULT (0),
    IsInclusive BIT NOT NULL CONSTRAINT DF_Taxes_Inclusive DEFAULT (0),
    IsDefault BIT NOT NULL CONSTRAINT DF_Taxes_Default DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_Taxes_Active DEFAULT (1),
    Description NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Taxes_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Taxes_Code UNIQUE (TaxCode)
);
GO

CREATE INDEX IX_Taxes_Type ON Taxes(TaxType);
CREATE INDEX IX_Taxes_Active ON Taxes(IsActive);
GO

INSERT INTO Taxes (TaxCode, TaxName, TaxType, TaxRate, IsInclusive, IsDefault, IsActive, Description)
SELECT 'PPN-11', 'PPN 11%', 'PPN', 11, 0, 1, 1, 'Pajak Pertambahan Nilai standar'
WHERE NOT EXISTS (SELECT 1 FROM Taxes WHERE TaxCode = 'PPN-11');

INSERT INTO Taxes (TaxCode, TaxName, TaxType, TaxRate, IsInclusive, IsDefault, IsActive, Description)
SELECT 'SVC-10', 'Service Charge 10%', 'SERVICE_CHARGE', 10, 0, 0, 1, 'Biaya layanan restoran/cafe'
WHERE NOT EXISTS (SELECT 1 FROM Taxes WHERE TaxCode = 'SVC-10');
GO

PRINT 'Taxes table created.';
GO
