-- Migration: Permissions & RolePermissions (run on existing LatihanASP_POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.RolePermissions', N'U') IS NULL
BEGIN
    IF OBJECT_ID(N'dbo.Permissions', N'U') IS NULL
    BEGIN
        CREATE TABLE Permissions (
            Id INT PRIMARY KEY IDENTITY(1,1),
            PermissionName NVARCHAR(100) NOT NULL
        );
    END

    CREATE TABLE RolePermissions (
        Id INT PRIMARY KEY IDENTITY(1,1),
        RoleId INT NOT NULL,
        PermissionId INT NOT NULL,
        CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id),
        CONSTRAINT FK_RolePermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES Permissions(Id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM Permissions)
BEGIN
    INSERT INTO Permissions (PermissionName) VALUES
    ('sales.create'), ('sales.view'), ('product.manage'), ('report.view');
END
GO

IF NOT EXISTS (SELECT 1 FROM RolePermissions)
BEGIN
    INSERT INTO RolePermissions (RoleId, PermissionId)
    SELECT 1, Id FROM Permissions;
    INSERT INTO RolePermissions (RoleId, PermissionId)
    SELECT 2, Id FROM Permissions WHERE PermissionName IN ('sales.create', 'sales.view');
END
GO

PRINT 'RolePermissions migration completed.';
GO
