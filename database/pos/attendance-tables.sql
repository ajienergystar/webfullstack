-- Migration: Attendances table (run on existing LatihanASP_POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.Attendances', N'U') IS NOT NULL DROP TABLE dbo.Attendances;
GO

CREATE TABLE Attendances (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    OutletId INT NULL,
    AttendanceDate DATE NOT NULL,
    ClockIn DATETIME2 NOT NULL,
    ClockOut DATETIME2 NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Attendances_Status DEFAULT ('Present'),
    Notes NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Attendances_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Attendances_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_Attendances_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id)
);
GO

CREATE INDEX IX_Attendances_UserId ON Attendances(UserId);
CREATE INDEX IX_Attendances_AttendanceDate ON Attendances(AttendanceDate);
GO

INSERT INTO Attendances (UserId, OutletId, AttendanceDate, ClockIn, ClockOut, Status, Notes) VALUES
(2, 1, CAST(SYSUTCDATETIME() AS DATE), DATEADD(HOUR, -8, SYSUTCDATETIME()), NULL, 'Present', 'Shift pagi'),
(3, 1, CAST(SYSUTCDATETIME() AS DATE), DATEADD(HOUR, -7, SYSUTCDATETIME()), DATEADD(HOUR, -1, SYSUTCDATETIME()), 'Present', NULL);
GO

PRINT 'Attendances table created successfully.';
GO
