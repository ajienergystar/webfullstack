-- LatihanASP_DB - SQL Server schema
-- (Converted from MySQL: IDENTITY, BIT, DATETIME2, trigger for updated_at)

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'LatihanASP_DB')
BEGIN
    CREATE DATABASE LatihanASP_DB;
END
GO

USE LatihanASP_DB;
GO

-- Drop child tables first (foreign keys)
IF OBJECT_ID(N'dbo.trg_users_updated_at', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_users_updated_at;
GO

IF OBJECT_ID(N'dbo.email_verifications', N'U') IS NOT NULL DROP TABLE dbo.email_verifications;
IF OBJECT_ID(N'dbo.user_sessions', N'U') IS NOT NULL DROP TABLE dbo.user_sessions;
IF OBJECT_ID(N'dbo.password_resets', N'U') IS NOT NULL DROP TABLE dbo.password_resets;
IF OBJECT_ID(N'dbo.users', N'U') IS NOT NULL DROP TABLE dbo.users;
GO

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

CREATE TABLE dbo.users (
    id              BIGINT IDENTITY(1,1) NOT NULL,
    full_name       NVARCHAR(100) NOT NULL,
    email           NVARCHAR(150) NOT NULL,
    phone           NVARCHAR(20) NULL,
    password_hash   NVARCHAR(255) NOT NULL,
    profile_image   NVARCHAR(MAX) NULL,
    is_verified     BIT NOT NULL CONSTRAINT DF_users_is_verified DEFAULT (0),
    is_active       BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1),
    last_login      DATETIME2 NULL,
    created_at      DATETIME2 NOT NULL CONSTRAINT DF_users_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at      DATETIME2 NOT NULL CONSTRAINT DF_users_updated_at DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT UQ_users_phone UNIQUE (phone)
);
GO

CREATE TRIGGER dbo.trg_users_updated_at
ON dbo.users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT UPDATE(updated_at)
    BEGIN
        UPDATE u
        SET updated_at = SYSUTCDATETIME()
        FROM dbo.users u
        INNER JOIN inserted i ON u.id = i.id;
    END
END;
GO

-- ---------------------------------------------------------------------------
-- password_resets
-- ---------------------------------------------------------------------------
CREATE TABLE dbo.password_resets (
    id           BIGINT IDENTITY(1,1) NOT NULL,
    user_id      BIGINT NOT NULL,
    reset_token  NVARCHAR(255) NOT NULL,
    expired_at   DATETIME2 NOT NULL,
    used         BIT NOT NULL CONSTRAINT DF_password_resets_used DEFAULT (0),
    created_at   DATETIME2 NOT NULL CONSTRAINT DF_password_resets_created_at DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_password_resets PRIMARY KEY (id),
    CONSTRAINT FK_password_resets_users FOREIGN KEY (user_id)
        REFERENCES dbo.users (id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_password_resets_user_id ON dbo.password_resets (user_id);
GO

-- ---------------------------------------------------------------------------
-- user_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE dbo.user_sessions (
    id             BIGINT IDENTITY(1,1) NOT NULL,
    user_id        BIGINT NOT NULL,
    access_token   NVARCHAR(MAX) NOT NULL,
    refresh_token  NVARCHAR(MAX) NULL,
    device_info    NVARCHAR(255) NULL,
    ip_address     NVARCHAR(100) NULL,
    expired_at     DATETIME2 NULL,
    created_at     DATETIME2 NOT NULL CONSTRAINT DF_user_sessions_created_at DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_user_sessions PRIMARY KEY (id),
    CONSTRAINT FK_user_sessions_users FOREIGN KEY (user_id)
        REFERENCES dbo.users (id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_user_sessions_user_id ON dbo.user_sessions (user_id);
GO

-- ---------------------------------------------------------------------------
-- email_verifications
-- ---------------------------------------------------------------------------
CREATE TABLE dbo.email_verifications (
    id                BIGINT IDENTITY(1,1) NOT NULL,
    user_id           BIGINT NOT NULL,
    verification_code NVARCHAR(10) NULL,
    expired_at        DATETIME2 NULL,
    verified          BIT NOT NULL CONSTRAINT DF_email_verifications_verified DEFAULT (0),
    created_at        DATETIME2 NOT NULL CONSTRAINT DF_email_verifications_created_at DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_email_verifications PRIMARY KEY (id),
    CONSTRAINT FK_email_verifications_users FOREIGN KEY (user_id)
        REFERENCES dbo.users (id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_email_verifications_user_id ON dbo.email_verifications (user_id);
GO

PRINT 'LatihanASP_DB schema created successfully.';
GO
