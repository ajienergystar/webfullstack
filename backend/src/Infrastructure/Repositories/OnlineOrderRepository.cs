using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class OnlineOrderRepository : IOnlineOrderRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public OnlineOrderRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<OnlineOrderListResponseDto> GetListAsync(
        string? search,
        DateTime? dateFrom,
        DateTime? dateTo,
        string? orderStatus,
        string? paymentStatus,
        string? orderSource,
        int? outletId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var conditions = new List<string>();
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add("(O.OrderNumber LIKE @search OR ISNULL(C.CustomerName, O.GuestName) LIKE @search OR ISNULL(C.PhoneNumber, O.GuestPhone) LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (dateFrom.HasValue)
        {
            conditions.Add("O.OrderDate >= @dateFrom");
            cmd.Parameters.AddWithValue("@dateFrom", dateFrom.Value.Date);
        }

        if (dateTo.HasValue)
        {
            conditions.Add("O.OrderDate < @dateTo");
            cmd.Parameters.AddWithValue("@dateTo", dateTo.Value.Date.AddDays(1));
        }

        if (!string.IsNullOrWhiteSpace(orderStatus))
        {
            conditions.Add("O.OrderStatus = @orderStatus");
            cmd.Parameters.AddWithValue("@orderStatus", orderStatus);
        }

        if (!string.IsNullOrWhiteSpace(paymentStatus))
        {
            conditions.Add("O.PaymentStatus = @paymentStatus");
            cmd.Parameters.AddWithValue("@paymentStatus", paymentStatus);
        }

        if (!string.IsNullOrWhiteSpace(orderSource))
        {
            conditions.Add("O.OrderSource = @orderSource");
            cmd.Parameters.AddWithValue("@orderSource", orderSource);
        }

        if (outletId.HasValue)
        {
            conditions.Add("O.OutletId = @outletId");
            cmd.Parameters.AddWithValue("@outletId", outletId.Value);
        }

        var where = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";

        cmd.CommandText = $@"
            SELECT
                O.Id, O.OrderNumber, O.OrderDate,
                ISNULL(C.CustomerName, ISNULL(O.GuestName, 'Guest')),
                ISNULL(C.PhoneNumber, O.GuestPhone),
                ISNULL(OT.OutletName, ''),
                O.OrderSource, O.FulfillmentType, O.GrandTotal,
                O.PaymentStatus, O.PaymentMethod, O.OrderStatus, O.Notes,
                (SELECT COUNT(1) FROM OnlineOrderDetails D WHERE D.OnlineOrderId = O.Id)
            FROM OnlineOrders O
            LEFT JOIN Customers C ON O.CustomerId = C.Id
            LEFT JOIN Outlets OT ON O.OutletId = OT.Id
            {where}
            ORDER BY O.OrderDate DESC";

        var orders = new List<OnlineOrderListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                orders.Add(new OnlineOrderListItemDto
                {
                    Id = reader.GetInt64(0),
                    OrderNumber = reader.GetString(1),
                    OrderDate = reader.GetDateTime(2),
                    CustomerName = reader.GetString(3),
                    CustomerPhone = reader.IsDBNull(4) ? null : reader.GetString(4),
                    OutletName = reader.GetString(5),
                    OrderSource = reader.GetString(6),
                    FulfillmentType = reader.GetString(7),
                    GrandTotal = reader.GetDecimal(8),
                    PaymentStatus = reader.GetString(9),
                    PaymentMethod = reader.IsDBNull(10) ? null : reader.GetString(10),
                    OrderStatus = reader.GetString(11),
                    Notes = reader.IsDBNull(12) ? null : reader.GetString(12),
                    ItemCount = reader.GetInt32(13)
                });
            }
        }

        return new OnlineOrderListResponseDto
        {
            Orders = orders,
            TotalCount = orders.Count,
            PendingCount = orders.Count(o => o.OrderStatus == "PENDING"),
            ActiveCount = orders.Count(o => o.OrderStatus is "CONFIRMED" or "PROCESSING" or "READY"),
            TotalGrandTotal = orders.Sum(o => o.GrandTotal)
        };
    }

    public async Task<OnlineOrderDetailDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        OnlineOrderDetailDto? header = null;

        await using (var cmd = new SqlCommand(@"
            SELECT O.Id, O.OrderNumber, O.OrderDate, O.CustomerId,
                   ISNULL(C.CustomerName, ISNULL(O.GuestName, 'Guest')),
                   ISNULL(C.PhoneNumber, O.GuestPhone), O.GuestEmail,
                   O.DeliveryAddress, O.OutletId, ISNULL(OT.OutletName, ''),
                   O.OrderSource, O.FulfillmentType,
                   O.SubTotal, O.Discount, O.Tax, O.GrandTotal,
                   O.PaymentStatus, O.PaymentMethod, O.OrderStatus,
                   O.Notes, O.ExternalOrderId, O.SalesTransactionId,
                   S.InvoiceNumber
            FROM OnlineOrders O
            LEFT JOIN Customers C ON O.CustomerId = C.Id
            LEFT JOIN Outlets OT ON O.OutletId = OT.Id
            LEFT JOIN SalesTransactions S ON O.SalesTransactionId = S.Id
            WHERE O.Id = @id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            header = new OnlineOrderDetailDto
            {
                Id = reader.GetInt64(0),
                OrderNumber = reader.GetString(1),
                OrderDate = reader.GetDateTime(2),
                CustomerId = reader.IsDBNull(3) ? null : reader.GetInt32(3),
                CustomerName = reader.GetString(4),
                CustomerPhone = reader.IsDBNull(5) ? null : reader.GetString(5),
                CustomerEmail = reader.IsDBNull(6) ? null : reader.GetString(6),
                DeliveryAddress = reader.IsDBNull(7) ? null : reader.GetString(7),
                OutletId = reader.GetInt32(8),
                OutletName = reader.GetString(9),
                OrderSource = reader.GetString(10),
                FulfillmentType = reader.GetString(11),
                SubTotal = reader.GetDecimal(12),
                Discount = reader.GetDecimal(13),
                Tax = reader.GetDecimal(14),
                GrandTotal = reader.GetDecimal(15),
                PaymentStatus = reader.GetString(16),
                PaymentMethod = reader.IsDBNull(17) ? null : reader.GetString(17),
                OrderStatus = reader.GetString(18),
                Notes = reader.IsDBNull(19) ? null : reader.GetString(19),
                ExternalOrderId = reader.IsDBNull(20) ? null : reader.GetString(20),
                SalesTransactionId = reader.IsDBNull(21) ? null : reader.GetInt64(21),
                InvoiceNumber = reader.IsDBNull(22) ? null : reader.GetString(22)
            };
        }

        var items = new List<OnlineOrderDetailItemDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT D.Id, D.ProductId, P.ProductCode, P.ProductName, P.Unit,
                   D.Qty, D.Price, D.Discount, D.Total, D.Notes
            FROM OnlineOrderDetails D
            INNER JOIN Products P ON D.ProductId = P.Id
            WHERE D.OnlineOrderId = @id
            ORDER BY D.Id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                items.Add(new OnlineOrderDetailItemDto
                {
                    DetailId = reader.GetInt64(0),
                    ProductId = reader.GetInt32(1),
                    ProductCode = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ProductName = reader.GetString(3),
                    Unit = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Qty = reader.GetInt32(5),
                    Price = reader.GetDecimal(6),
                    Discount = reader.GetDecimal(7),
                    Total = reader.GetDecimal(8),
                    Notes = reader.IsDBNull(9) ? null : reader.GetString(9)
                });
            }
        }

        header!.Items = items;
        return header;
    }

    public async Task UpdateStatusAsync(long id, UpdateOnlineOrderStatusRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            UPDATE OnlineOrders SET
                OrderStatus = @status,
                ProcessedByUserId = @userId,
                UpdatedAt = SYSUTCDATETIME()
            WHERE Id = @id", connection);

        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@status", request.OrderStatus);
        cmd.Parameters.AddWithValue("@userId", (object?)request.ProcessedByUserId ?? DBNull.Value);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) throw new InvalidOperationException("Pesanan online tidak ditemukan.");
    }

    public async Task<CompleteOnlineOrderResponseDto> CompleteAsync(long id, CompleteOnlineOrderRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var order = await GetOrderForCompleteAsync(connection, transaction, id);
            if (order.OrderStatus != "READY")
            {
                throw new InvalidOperationException("Hanya pesanan berstatus READY yang dapat diselesaikan.");
            }

            if (order.SalesTransactionId.HasValue)
            {
                throw new InvalidOperationException("Pesanan sudah dikonversi ke transaksi penjualan.");
            }

            await ValidateStockForItemsAsync(connection, transaction, order.Items);

            var paymentMethod = order.PaymentMethod ?? request.PaymentMethod;
            var paidAmount = order.PaymentStatus == "PAID" ? order.GrandTotal : order.GrandTotal;
            var changeAmount = 0m;
            var invoiceNumber = await GenerateInvoiceNumberAsync(connection, transaction);

            var salesId = await InsertSaleFromOrderAsync(
                connection, transaction, order, invoiceNumber, paymentMethod, paidAmount, changeAmount, request.UserId);

            foreach (var item in order.Items)
            {
                await InsertSaleDetailAsync(connection, transaction, salesId, item);
                await UpdateStockAsync(connection, transaction, item.ProductId, item.Qty);
                await InsertStockMovementAsync(connection, transaction, item.ProductId, item.Qty, invoiceNumber);
            }

            await using (var cmd = new SqlCommand(@"
                UPDATE OnlineOrders SET
                    OrderStatus = 'COMPLETED',
                    SalesTransactionId = @salesId,
                    ProcessedByUserId = @userId,
                    CompletedAt = SYSUTCDATETIME(),
                    UpdatedAt = SYSUTCDATETIME(),
                    PaymentStatus = CASE WHEN PaymentStatus = 'UNPAID' THEN 'PAID' ELSE PaymentStatus END,
                    PaymentMethod = COALESCE(PaymentMethod, @paymentMethod)
                WHERE Id = @id", connection, transaction))
            {
                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@salesId", salesId);
                cmd.Parameters.AddWithValue("@userId", request.UserId);
                cmd.Parameters.AddWithValue("@paymentMethod", paymentMethod);
                await cmd.ExecuteNonQueryAsync();
            }

            await InsertAuditAsync(connection, transaction, request.UserId, salesId,
                $"Complete online order {order.OrderNumber} -> {invoiceNumber}");

            await transaction.CommitAsync();

            return new CompleteOnlineOrderResponseDto
            {
                OrderId = id,
                OrderNumber = order.OrderNumber,
                SalesId = salesId,
                InvoiceNumber = invoiceNumber,
                GrandTotal = order.GrandTotal
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private sealed class OrderCompleteData
    {
        public string OrderNumber { get; set; } = "";
        public string OrderStatus { get; set; } = "";
        public int? CustomerId { get; set; }
        public int OutletId { get; set; }
        public decimal SubTotal { get; set; }
        public decimal Discount { get; set; }
        public decimal Tax { get; set; }
        public decimal GrandTotal { get; set; }
        public string PaymentStatus { get; set; } = "";
        public string? PaymentMethod { get; set; }
        public long? SalesTransactionId { get; set; }
        public List<OrderItemData> Items { get; set; } = [];
    }

    private sealed class OrderItemData
    {
        public int ProductId { get; set; }
        public int Qty { get; set; }
        public decimal Price { get; set; }
        public decimal Discount { get; set; }
    }

    private static async Task<OrderCompleteData> GetOrderForCompleteAsync(
        SqlConnection connection, SqlTransaction transaction, long id)
    {
        OrderCompleteData? order = null;

        await using (var cmd = new SqlCommand(@"
            SELECT OrderNumber, OrderStatus, CustomerId, OutletId,
                   SubTotal, Discount, Tax, GrandTotal,
                   PaymentStatus, PaymentMethod, SalesTransactionId
            FROM OnlineOrders WHERE Id = @id", connection, transaction))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
                throw new InvalidOperationException("Pesanan online tidak ditemukan.");

            order = new OrderCompleteData
            {
                OrderNumber = reader.GetString(0),
                OrderStatus = reader.GetString(1),
                CustomerId = reader.IsDBNull(2) ? null : reader.GetInt32(2),
                OutletId = reader.GetInt32(3),
                SubTotal = reader.GetDecimal(4),
                Discount = reader.GetDecimal(5),
                Tax = reader.GetDecimal(6),
                GrandTotal = reader.GetDecimal(7),
                PaymentStatus = reader.GetString(8),
                PaymentMethod = reader.IsDBNull(9) ? null : reader.GetString(9),
                SalesTransactionId = reader.IsDBNull(10) ? null : reader.GetInt64(10)
            };
        }

        var items = new List<OrderItemData>();
        await using (var cmd = new SqlCommand(@"
            SELECT ProductId, Qty, Price, Discount
            FROM OnlineOrderDetails WHERE OnlineOrderId = @id", connection, transaction))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                items.Add(new OrderItemData
                {
                    ProductId = reader.GetInt32(0),
                    Qty = reader.GetInt32(1),
                    Price = reader.GetDecimal(2),
                    Discount = reader.GetDecimal(3)
                });
            }
        }

        order!.Items = items;
        return order;
    }

    private static async Task ValidateStockForItemsAsync(
        SqlConnection connection, SqlTransaction transaction, List<OrderItemData> items)
    {
        var required = items.GroupBy(i => i.ProductId).ToDictionary(g => g.Key, g => g.Sum(x => x.Qty));
        foreach (var (productId, qty) in required)
        {
            await using var cmd = new SqlCommand(
                "SELECT Stock FROM Products WHERE Id = @id AND IsActive = 1", connection, transaction);
            cmd.Parameters.AddWithValue("@id", productId);
            var result = await cmd.ExecuteScalarAsync();
            if (result is null)
                throw new InvalidOperationException($"Produk ID {productId} tidak ditemukan.");

            var stock = Convert.ToInt32(result);
            if (stock < qty)
            {
                throw new InvalidOperationException(
                    $"Stok produk ID {productId} tidak mencukupi (tersedia: {stock}, diminta: {qty}).");
            }
        }
    }

    private static async Task<string> GenerateInvoiceNumberAsync(SqlConnection connection, SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(@"
            SELECT COUNT(1) + 1 FROM SalesTransactions
            WHERE CAST(TransactionDate AS DATE) = CAST(SYSUTCDATETIME() AS DATE)", connection, transaction);
        var seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"INV-{DateTime.UtcNow:yyyyMMdd}-{seq:D3}";
    }

    private static async Task<long> InsertSaleFromOrderAsync(
        SqlConnection connection, SqlTransaction transaction,
        OrderCompleteData order, string invoiceNumber,
        string paymentMethod, decimal paidAmount, decimal changeAmount, int userId)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO SalesTransactions
            (InvoiceNumber, CustomerId, UserId, OutletId, SubTotal, Discount, Tax,
             GrandTotal, PaymentMethod, PaidAmount, ChangeAmount)
            OUTPUT INSERTED.Id
            VALUES (@invoice, @customerId, @userId, @outletId, @subTotal, @discount, @tax,
                    @grandTotal, @paymentMethod, @paidAmount, @changeAmount)", connection, transaction);

        cmd.Parameters.AddWithValue("@invoice", invoiceNumber);
        cmd.Parameters.AddWithValue("@customerId", (object?)order.CustomerId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@userId", userId);
        cmd.Parameters.AddWithValue("@outletId", order.OutletId);
        cmd.Parameters.AddWithValue("@subTotal", order.SubTotal);
        cmd.Parameters.AddWithValue("@discount", order.Discount);
        cmd.Parameters.AddWithValue("@tax", order.Tax);
        cmd.Parameters.AddWithValue("@grandTotal", order.GrandTotal);
        cmd.Parameters.AddWithValue("@paymentMethod", paymentMethod);
        cmd.Parameters.AddWithValue("@paidAmount", paidAmount);
        cmd.Parameters.AddWithValue("@changeAmount", changeAmount);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private static async Task InsertSaleDetailAsync(
        SqlConnection connection, SqlTransaction transaction, long salesId, OrderItemData item)
    {
        var lineTotal = item.Qty * item.Price - item.Discount;
        await using var cmd = new SqlCommand(@"
            INSERT INTO SalesTransactionDetails
            (SalesTransactionId, ProductId, Qty, Price, Discount, Total)
            VALUES (@salesId, @productId, @qty, @price, @discount, @total)", connection, transaction);

        cmd.Parameters.AddWithValue("@salesId", salesId);
        cmd.Parameters.AddWithValue("@productId", item.ProductId);
        cmd.Parameters.AddWithValue("@qty", item.Qty);
        cmd.Parameters.AddWithValue("@price", item.Price);
        cmd.Parameters.AddWithValue("@discount", item.Discount);
        cmd.Parameters.AddWithValue("@total", lineTotal);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task UpdateStockAsync(
        SqlConnection connection, SqlTransaction transaction, int productId, int qty)
    {
        await using var cmd = new SqlCommand(
            "UPDATE Products SET Stock = Stock - @qty WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@id", productId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertStockMovementAsync(
        SqlConnection connection, SqlTransaction transaction,
        int productId, int qty, string referenceNumber)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO StockMovements (ProductId, MovementType, Qty, ReferenceNumber)
            VALUES (@productId, 'OUT', @qty, @ref)", connection, transaction);

        cmd.Parameters.AddWithValue("@productId", productId);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@ref", referenceNumber);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertAuditAsync(
        SqlConnection connection, SqlTransaction transaction, int userId, long recordId, string action)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO AuditLogs (UserId, Action, TableName, RecordId)
            VALUES (@userId, @action, 'OnlineOrders', @recordId)", connection, transaction);

        cmd.Parameters.AddWithValue("@userId", userId);
        cmd.Parameters.AddWithValue("@action", action);
        cmd.Parameters.AddWithValue("@recordId", recordId);
        await cmd.ExecuteNonQueryAsync();
    }
}
