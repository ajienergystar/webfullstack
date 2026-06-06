-- Migration: OnlineOrders tables (run on existing LatihanASP_POS)
USE LatihanASP_POS;
GO

IF OBJECT_ID(N'dbo.OnlineOrderDetails', N'U') IS NOT NULL DROP TABLE dbo.OnlineOrderDetails;
IF OBJECT_ID(N'dbo.OnlineOrders', N'U') IS NOT NULL DROP TABLE dbo.OnlineOrders;
GO

CREATE TABLE OnlineOrders (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    OrderNumber NVARCHAR(50) NOT NULL,
    OrderDate DATETIME2 NOT NULL CONSTRAINT DF_OnlineOrders_OrderDate DEFAULT (SYSUTCDATETIME()),
    CustomerId INT NULL,
    GuestName NVARCHAR(100) NULL,
    GuestPhone NVARCHAR(20) NULL,
    GuestEmail NVARCHAR(100) NULL,
    DeliveryAddress NVARCHAR(500) NULL,
    OutletId INT NOT NULL,
    OrderSource NVARCHAR(30) NOT NULL CONSTRAINT DF_OnlineOrders_Source DEFAULT ('Website'),
    FulfillmentType NVARCHAR(20) NOT NULL CONSTRAINT DF_OnlineOrders_Fulfillment DEFAULT ('Pickup'),
    SubTotal DECIMAL(18,2) NOT NULL,
    Discount DECIMAL(18,2) NOT NULL CONSTRAINT DF_OnlineOrders_Discount DEFAULT (0),
    Tax DECIMAL(18,2) NOT NULL CONSTRAINT DF_OnlineOrders_Tax DEFAULT (0),
    GrandTotal DECIMAL(18,2) NOT NULL,
    PaymentStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_OnlineOrders_PaymentStatus DEFAULT ('UNPAID'),
    PaymentMethod NVARCHAR(50) NULL,
    OrderStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_OnlineOrders_OrderStatus DEFAULT ('PENDING'),
    Notes NVARCHAR(500) NULL,
    ExternalOrderId NVARCHAR(100) NULL,
    IntegrationId INT NULL,
    SalesTransactionId BIGINT NULL,
    ProcessedByUserId INT NULL,
    CompletedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_OnlineOrders_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT FK_OnlineOrders_Customers FOREIGN KEY (CustomerId) REFERENCES Customers(Id),
    CONSTRAINT FK_OnlineOrders_Outlets FOREIGN KEY (OutletId) REFERENCES Outlets(Id),
    CONSTRAINT FK_OnlineOrders_Integrations FOREIGN KEY (IntegrationId) REFERENCES ExternalIntegrations(Id),
    CONSTRAINT FK_OnlineOrders_Sales FOREIGN KEY (SalesTransactionId) REFERENCES SalesTransactions(Id),
    CONSTRAINT FK_OnlineOrders_Users FOREIGN KEY (ProcessedByUserId) REFERENCES Users(Id),
    CONSTRAINT CK_OnlineOrders_Source CHECK (OrderSource IN ('Website', 'App', 'Shopee', 'Tokopedia', 'WhatsApp', 'GrabFood', 'GoFood')),
    CONSTRAINT CK_OnlineOrders_Fulfillment CHECK (FulfillmentType IN ('Delivery', 'Pickup', 'DineIn')),
    CONSTRAINT CK_OnlineOrders_PaymentStatus CHECK (PaymentStatus IN ('UNPAID', 'PAID', 'REFUNDED')),
    CONSTRAINT CK_OnlineOrders_OrderStatus CHECK (OrderStatus IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'))
);

CREATE TABLE OnlineOrderDetails (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    OnlineOrderId BIGINT NOT NULL,
    ProductId INT NOT NULL,
    Qty INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Discount DECIMAL(18,2) NOT NULL CONSTRAINT DF_OnlineOrderDetail_Discount DEFAULT (0),
    Total DECIMAL(18,2) NOT NULL,
    Notes NVARCHAR(255) NULL,
    CONSTRAINT FK_OnlineOrderDetails_Order FOREIGN KEY (OnlineOrderId) REFERENCES OnlineOrders(Id) ON DELETE CASCADE,
    CONSTRAINT FK_OnlineOrderDetails_Products FOREIGN KEY (ProductId) REFERENCES Products(Id)
);

CREATE INDEX IX_OnlineOrders_OrderDate ON OnlineOrders(OrderDate);
CREATE INDEX IX_OnlineOrders_OrderStatus ON OnlineOrders(OrderStatus);
CREATE INDEX IX_OnlineOrders_PaymentStatus ON OnlineOrders(PaymentStatus);
CREATE INDEX IX_OnlineOrders_OutletId ON OnlineOrders(OutletId);
CREATE INDEX IX_OnlineOrders_OrderSource ON OnlineOrders(OrderSource);
CREATE INDEX IX_OnlineOrderDetails_OrderId ON OnlineOrderDetails(OnlineOrderId);
GO

-- Sample online orders
INSERT INTO OnlineOrders (
    OrderNumber, OrderDate, CustomerId, GuestName, GuestPhone, DeliveryAddress,
    OutletId, OrderSource, FulfillmentType,
    SubTotal, Discount, Tax, GrandTotal,
    PaymentStatus, PaymentMethod, OrderStatus, Notes
) VALUES
(
    'WEB-20250606-001', DATEADD(MINUTE, -45, SYSUTCDATETIME()), 1, NULL, '081234567890',
    'Jl. Pandanaran No. 12, Semarang', 1, 'Website', 'Delivery',
    33000, 0, 3300, 36300, 'PAID', 'QRIS', 'PENDING', 'Tolong dibungkus rapi'
),
(
    'WEB-20250606-002', DATEADD(MINUTE, -120, SYSUTCDATETIME()), NULL, 'Rina Kartika', '08199887766',
    NULL, 1, 'App', 'Pickup',
    23000, 1000, 2200, 24200, 'PAID', 'Transfer', 'CONFIRMED', 'Pickup jam 14:00'
),
(
    'WEB-20250605-003', DATEADD(HOUR, -5, SYSUTCDATETIME()), 2, NULL, '081987654321',
    'Jl. Sudirman No. 45, Jakarta', 2, 'WhatsApp', 'Delivery',
    45000, 0, 4500, 49500, 'UNPAID', NULL, 'PROCESSING', NULL
),
(
    'WEB-20250605-004', DATEADD(HOUR, -8, SYSUTCDATETIME()), NULL, 'Dewi Lestari', '08122334455',
    NULL, 1, 'Shopee', 'Pickup',
    16000, 0, 1600, 17600, 'PAID', 'Transfer', 'READY', 'Pesanan Shopee #SP12345'
),
(
    'WEB-20250604-005', DATEADD(DAY, -1, SYSUTCDATETIME()), 1, NULL, '081234567890',
    'Telaga Mas Raya, Semarang', 1, 'Website', 'Delivery',
    50000, 5000, 4500, 49500, 'PAID', 'QRIS', 'COMPLETED', NULL
),
(
    'WEB-20250604-006', DATEADD(DAY, -1, SYSUTCDATETIME()), NULL, 'Budi Online', '08155667788',
    NULL, 1, 'Tokopedia', 'Pickup',
    18000, 0, 1800, 19800, 'REFUNDED', 'Transfer', 'CANCELLED', 'Dibatalkan pelanggan'
);

INSERT INTO OnlineOrderDetails (OnlineOrderId, ProductId, Qty, Price, Discount, Total) VALUES
(1, 1, 2, 5000, 0, 10000),
(1, 2, 1, 18000, 0, 18000),
(1, 3, 1, 5000, 0, 5000),
(2, 3, 1, 15000, 0, 15000),
(2, 4, 2, 4000, 0, 8000),
(3, 3, 3, 15000, 0, 45000),
(4, 6, 1, 16000, 0, 16000),
(5, 1, 5, 5000, 0, 25000),
(5, 2, 1, 18000, 0, 18000),
(5, 5, 1, 8000, 5000, 3000),
(6, 2, 1, 18000, 0, 18000);

PRINT 'OnlineOrders tables created with sample data.';
GO
