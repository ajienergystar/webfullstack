-- Migration: ProductBundles & ProductBundleItems (paket bundling produk)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.ProductBundleItems', N'U') IS NOT NULL DROP TABLE dbo.ProductBundleItems;
IF OBJECT_ID(N'dbo.ProductBundles', N'U') IS NOT NULL DROP TABLE dbo.ProductBundles;
GO

CREATE TABLE ProductBundles (
    Id INT PRIMARY KEY IDENTITY(1,1),
    BundleCode NVARCHAR(50) NOT NULL,
    BundleName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255) NULL,
    BundlePrice DECIMAL(18,2) NOT NULL,
    StartDate DATETIME2 NOT NULL,
    EndDate DATETIME2 NULL,
    OutletId INT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_ProductBundles_IsActive DEFAULT (1),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ProductBundles_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_ProductBundles_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id),
    CONSTRAINT UQ_ProductBundles_Code UNIQUE (BundleCode)
);

CREATE TABLE ProductBundleItems (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ProductBundleId INT NOT NULL,
    ProductId INT NOT NULL,
    Qty INT NOT NULL CONSTRAINT DF_PBI_Qty DEFAULT (1),
    CONSTRAINT FK_PBI_Bundle FOREIGN KEY (ProductBundleId) REFERENCES ProductBundles(Id) ON DELETE CASCADE,
    CONSTRAINT FK_PBI_Product FOREIGN KEY (ProductId) REFERENCES Products(Id),
    CONSTRAINT UQ_PBI_BundleProduct UNIQUE (ProductBundleId, ProductId),
    CONSTRAINT CK_PBI_Qty CHECK (Qty > 0)
);
GO

CREATE INDEX IX_ProductBundles_Active ON ProductBundles(IsActive);
CREATE INDEX IX_ProductBundles_Dates ON ProductBundles(StartDate, EndDate);
CREATE INDEX IX_ProductBundleItems_Bundle ON ProductBundleItems(ProductBundleId);
CREATE INDEX IX_ProductBundleItems_Product ON ProductBundleItems(ProductId);
GO

INSERT INTO ProductBundles (BundleCode, BundleName, Description, BundlePrice, StartDate, EndDate, IsActive)
SELECT 'BND001', 'Paket Minuman Hemat', 'Teh Botol + Air Mineral', 12000, SYSUTCDATETIME(), DATEADD(MONTH, 1, SYSUTCDATETIME()), 1
WHERE NOT EXISTS (SELECT 1 FROM ProductBundles WHERE BundleCode = 'BND001');

INSERT INTO ProductBundleItems (ProductBundleId, ProductId, Qty)
SELECT B.Id, P.Id, 1
FROM ProductBundles B
CROSS JOIN Products P
WHERE B.BundleCode = 'BND001' AND P.ProductCode = 'PRD001'
  AND NOT EXISTS (
      SELECT 1 FROM ProductBundleItems I
      WHERE I.ProductBundleId = B.Id AND I.ProductId = P.Id
  );

INSERT INTO ProductBundleItems (ProductBundleId, ProductId, Qty)
SELECT B.Id, P.Id, 1
FROM ProductBundles B
CROSS JOIN Products P
WHERE B.BundleCode = 'BND001' AND P.ProductCode = 'PRD002'
  AND NOT EXISTS (
      SELECT 1 FROM ProductBundleItems I
      WHERE I.ProductBundleId = B.Id AND I.ProductId = P.Id
  );
GO

PRINT 'ProductBundles tables created.';
GO
