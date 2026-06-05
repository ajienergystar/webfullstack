-- Migration: MembershipLevels (master level membership)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.MembershipLevels', N'U') IS NOT NULL DROP TABLE dbo.MembershipLevels;
GO

CREATE TABLE MembershipLevels (
    Id INT PRIMARY KEY IDENTITY(1,1),
    LevelName NVARCHAR(50) NOT NULL,
    MinLoyaltyPoint INT NOT NULL CONSTRAINT DF_MembershipLevels_MinLoyaltyPoint DEFAULT (0),
    DiscountPercent DECIMAL(5,2) NOT NULL CONSTRAINT DF_MembershipLevels_DiscountPercent DEFAULT (0),
    Description NVARCHAR(255) NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_MembershipLevels_SortOrder DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_MembershipLevels_IsActive DEFAULT (1),
    CONSTRAINT UQ_MembershipLevels_LevelName UNIQUE (LevelName),
    CONSTRAINT CK_MembershipLevels_DiscountPercent CHECK (DiscountPercent >= 0 AND DiscountPercent <= 100),
    CONSTRAINT CK_MembershipLevels_MinLoyaltyPoint CHECK (MinLoyaltyPoint >= 0)
);
GO

CREATE INDEX IX_MembershipLevels_SortOrder ON MembershipLevels(SortOrder);
CREATE INDEX IX_MembershipLevels_IsActive ON MembershipLevels(IsActive);
GO

INSERT INTO MembershipLevels (LevelName, MinLoyaltyPoint, DiscountPercent, Description, SortOrder, IsActive) VALUES
('Bronze', 0, 0, 'Level dasar untuk member baru', 1, 1),
('Silver', 50, 5, 'Diskon 5% untuk member setia', 2, 1),
('Gold', 100, 10, 'Diskon 10% + prioritas layanan', 3, 1),
('Platinum', 200, 15, 'Diskon 15% + benefit eksklusif', 4, 1);
GO

PRINT 'MembershipLevels table created.';
