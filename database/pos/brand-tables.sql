-- Migration: Brands table + Products.BrandId (run on existing LatihanASP_POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.Brands', N'U') IS NULL
BEGIN
    CREATE TABLE Brands (
        Id INT PRIMARY KEY IDENTITY(1,1),
        BrandName NVARCHAR(100) NOT NULL,
        Description NVARCHAR(255) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Brands_IsActive DEFAULT (1)
    );
END
GO

IF COL_LENGTH('dbo.Products', 'BrandId') IS NULL
BEGIN
    ALTER TABLE Products ADD BrandId INT NULL;
    ALTER TABLE Products ADD CONSTRAINT FK_Products_Brands FOREIGN KEY (BrandId) REFERENCES Brands(Id);
    CREATE INDEX IX_Products_BrandId ON Products(BrandId);
END
GO

IF NOT EXISTS (SELECT 1 FROM Brands)
BEGIN
    INSERT INTO Brands (BrandName, Description) VALUES
    ('Teh Kotak', 'Minuman teh kemasan'),
    ('Indofood', 'Makanan instan'),
    ('Kopi Kenangan', 'Minuman kopi');
END
GO

PRINT 'Brands tables migrated.';
GO
