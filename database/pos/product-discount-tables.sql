-- Migration: ProductDiscounts & ProductDiscountItems (diskon produk per item)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.ProductDiscountItems', N'U') IS NOT NULL DROP TABLE dbo.ProductDiscountItems;
IF OBJECT_ID(N'dbo.ProductDiscounts', N'U') IS NOT NULL DROP TABLE dbo.ProductDiscounts;
GO

CREATE TABLE ProductDiscounts (
    Id INT PRIMARY KEY IDENTITY(1,1),
    DiscountName NVARCHAR(100) NOT NULL,
    DiscountType NVARCHAR(20) NOT NULL,
    DiscountValue DECIMAL(18,2) NOT NULL,
    MinPurchaseAmount DECIMAL(18,2) NULL,
    StartDate DATETIME2 NOT NULL,
    EndDate DATETIME2 NULL,
    OutletId INT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_ProductDiscounts_IsActive DEFAULT (1),
    Description NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ProductDiscounts_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_ProductDiscounts_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id),
    CONSTRAINT CK_ProductDiscounts_Type CHECK (DiscountType IN ('PERCENT', 'FIXED'))
);

CREATE TABLE ProductDiscountItems (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ProductDiscountId INT NOT NULL,
    ProductId INT NOT NULL,
    CONSTRAINT FK_PDI_Discount FOREIGN KEY (ProductDiscountId) REFERENCES ProductDiscounts(Id) ON DELETE CASCADE,
    CONSTRAINT FK_PDI_Product FOREIGN KEY (ProductId) REFERENCES Products(Id),
    CONSTRAINT UQ_PDI_DiscountProduct UNIQUE (ProductDiscountId, ProductId)
);
GO

CREATE INDEX IX_ProductDiscounts_Active ON ProductDiscounts(IsActive);
CREATE INDEX IX_ProductDiscounts_Dates ON ProductDiscounts(StartDate, EndDate);
CREATE INDEX IX_ProductDiscountItems_Discount ON ProductDiscountItems(ProductDiscountId);
CREATE INDEX IX_ProductDiscountItems_Product ON ProductDiscountItems(ProductId);
GO

INSERT INTO ProductDiscounts (DiscountName, DiscountType, DiscountValue, MinPurchaseAmount, StartDate, EndDate, IsActive, Description)
SELECT 'Diskon Teh Botol 10%', 'PERCENT', 10, NULL, SYSUTCDATETIME(), DATEADD(MONTH, 1, SYSUTCDATETIME()), 1, 'Promo minuman teh kemasan'
WHERE NOT EXISTS (SELECT 1 FROM ProductDiscounts WHERE DiscountName = 'Diskon Teh Botol 10%');

INSERT INTO ProductDiscountItems (ProductDiscountId, ProductId)
SELECT D.Id, P.Id
FROM ProductDiscounts D
CROSS JOIN Products P
WHERE D.DiscountName = 'Diskon Teh Botol 10%' AND P.ProductCode = 'PRD001'
  AND NOT EXISTS (
      SELECT 1 FROM ProductDiscountItems I
      WHERE I.ProductDiscountId = D.Id AND I.ProductId = P.Id
  );
GO

PRINT 'ProductDiscounts tables created.';
GO
