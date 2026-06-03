using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class SalesRepository : ISalesRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public SalesRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<SalesFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var products = new List<SalesProductDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT P.Id, P.ProductCode, P.ProductName, P.Barcode, C.CategoryName,
                   P.SellingPrice, P.Stock, P.Unit
            FROM Products P
            LEFT JOIN Categories C ON P.CategoryId = C.Id
            WHERE P.IsActive = 1
            ORDER BY P.ProductName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                products.Add(new SalesProductDto
                {
                    Id = reader.GetInt32(0),
                    ProductCode = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    ProductName = reader.GetString(2),
                    Barcode = reader.IsDBNull(3) ? null : reader.GetString(3),
                    CategoryName = reader.IsDBNull(4) ? null : reader.GetString(4),
                    SellingPrice = reader.GetDecimal(5),
                    Stock = reader.GetInt32(6),
                    Unit = reader.IsDBNull(7) ? null : reader.GetString(7)
                });
            }
        }

        var customers = new List<SalesCustomerDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT Id, CustomerName, PhoneNumber, LoyaltyPoint
            FROM Customers
            ORDER BY CustomerName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                customers.Add(new SalesCustomerDto
                {
                    Id = reader.GetInt32(0),
                    CustomerName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    PhoneNumber = reader.IsDBNull(2) ? null : reader.GetString(2),
                    LoyaltyPoint = reader.GetInt32(3)
                });
            }
        }

        var outlets = new List<SalesOutletDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT Id, OutletName FROM Outlets ORDER BY OutletName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                outlets.Add(new SalesOutletDto
                {
                    Id = reader.GetInt32(0),
                    OutletName = reader.IsDBNull(1) ? "" : reader.GetString(1)
                });
            }
        }

        var users = new List<SalesUserDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT U.Id, U.FullName, U.Username, R.RoleName
            FROM Users U
            INNER JOIN Roles R ON U.RoleId = R.Id
            WHERE U.IsActive = 1
            ORDER BY U.FullName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                users.Add(new SalesUserDto
                {
                    Id = reader.GetInt32(0),
                    FullName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    Username = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    RoleName = reader.IsDBNull(3) ? "" : reader.GetString(3)
                });
            }
        }

        return new SalesFormDataDto
        {
            Products = products,
            Customers = customers,
            Outlets = outlets,
            Users = users
        };
    }

    public async Task<CreateSaleResponseDto> CreateSaleAsync(CreateSaleRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            var productStocks = await LoadProductStocksAsync(connection, transaction, request.Items);
            ValidateStock(request.Items, productStocks);

            var subTotal = request.Items.Sum(i => i.Qty * i.Price - i.Discount);
            var grandTotal = subTotal - request.Discount + request.Tax;
            var changeAmount = request.PaidAmount - grandTotal;
            var invoiceNumber = await GenerateInvoiceNumberAsync(connection, transaction);

            var salesId = await InsertSalesTransactionAsync(
                connection, transaction, request, invoiceNumber, subTotal, grandTotal, changeAmount);

            foreach (var item in request.Items)
            {
                var lineTotal = item.Qty * item.Price - item.Discount;
                await InsertSalesDetailAsync(connection, transaction, salesId, item, lineTotal);
                await UpdateProductStockAsync(connection, transaction, item.ProductId, item.Qty);
                await InsertStockMovementAsync(connection, transaction, item.ProductId, item.Qty, invoiceNumber);
            }

            await InsertAuditLogAsync(connection, transaction, request.UserId, salesId, invoiceNumber);

            await transaction.CommitAsync();

            return new CreateSaleResponseDto
            {
                Id = salesId,
                InvoiceNumber = invoiceNumber,
                SubTotal = subTotal,
                Discount = request.Discount,
                Tax = request.Tax,
                GrandTotal = grandTotal,
                PaidAmount = request.PaidAmount,
                ChangeAmount = changeAmount,
                TransactionDate = DateTime.UtcNow
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static async Task<Dictionary<int, int>> LoadProductStocksAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        List<CreateSaleItemDto> items)
    {
        var productIds = items.Select(i => i.ProductId).Distinct().ToList();
        var stocks = new Dictionary<int, int>();

        foreach (var productId in productIds)
        {
            await using var cmd = new SqlCommand(
                "SELECT Stock FROM Products WHERE Id = @id AND IsActive = 1", connection, transaction);
            cmd.Parameters.AddWithValue("@id", productId);
            var result = await cmd.ExecuteScalarAsync();

            if (result is null)
            {
                throw new InvalidOperationException($"Produk dengan ID {productId} tidak ditemukan.");
            }

            stocks[productId] = Convert.ToInt32(result);
        }

        return stocks;
    }

    private static void ValidateStock(List<CreateSaleItemDto> items, Dictionary<int, int> stocks)
    {
        var requiredQty = items
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Qty));

        foreach (var (productId, qty) in requiredQty)
        {
            if (!stocks.TryGetValue(productId, out var stock) || stock < qty)
            {
                throw new InvalidOperationException(
                    $"Stok produk ID {productId} tidak mencukupi (tersedia: {stock}, diminta: {qty}).");
            }
        }
    }

    private static async Task<string> GenerateInvoiceNumberAsync(
        SqlConnection connection,
        SqlTransaction transaction)
    {
        await using var cmd = new SqlCommand(@"
            SELECT COUNT(1) + 1
            FROM SalesTransactions
            WHERE CAST(TransactionDate AS DATE) = CAST(SYSUTCDATETIME() AS DATE)", connection, transaction);

        var seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"INV-{DateTime.UtcNow:yyyyMMdd}-{seq:D3}";
    }

    private static async Task<long> InsertSalesTransactionAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        CreateSaleRequestDto request,
        string invoiceNumber,
        decimal subTotal,
        decimal grandTotal,
        decimal changeAmount)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO SalesTransactions
            (InvoiceNumber, CustomerId, UserId, OutletId, SubTotal, Discount, Tax,
             GrandTotal, PaymentMethod, PaidAmount, ChangeAmount)
            OUTPUT INSERTED.Id
            VALUES
            (@invoice, @customerId, @userId, @outletId, @subTotal, @discount, @tax,
             @grandTotal, @paymentMethod, @paidAmount, @changeAmount)", connection, transaction);

        cmd.Parameters.AddWithValue("@invoice", invoiceNumber);
        cmd.Parameters.AddWithValue("@customerId", (object?)request.CustomerId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@userId", request.UserId);
        cmd.Parameters.AddWithValue("@outletId", request.OutletId);
        cmd.Parameters.AddWithValue("@subTotal", subTotal);
        cmd.Parameters.AddWithValue("@discount", request.Discount);
        cmd.Parameters.AddWithValue("@tax", request.Tax);
        cmd.Parameters.AddWithValue("@grandTotal", grandTotal);
        cmd.Parameters.AddWithValue("@paymentMethod", request.PaymentMethod);
        cmd.Parameters.AddWithValue("@paidAmount", request.PaidAmount);
        cmd.Parameters.AddWithValue("@changeAmount", changeAmount);

        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private static async Task InsertSalesDetailAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        long salesId,
        CreateSaleItemDto item,
        decimal lineTotal)
    {
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

    private static async Task UpdateProductStockAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        int productId,
        int qty)
    {
        await using var cmd = new SqlCommand(
            "UPDATE Products SET Stock = Stock - @qty WHERE Id = @id", connection, transaction);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@id", productId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertStockMovementAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        int productId,
        int qty,
        string referenceNumber)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO StockMovements (ProductId, MovementType, Qty, ReferenceNumber)
            VALUES (@productId, 'OUT', @qty, @ref)", connection, transaction);

        cmd.Parameters.AddWithValue("@productId", productId);
        cmd.Parameters.AddWithValue("@qty", qty);
        cmd.Parameters.AddWithValue("@ref", referenceNumber);

        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertAuditLogAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        int userId,
        long salesId,
        string invoiceNumber)
    {
        await using var cmd = new SqlCommand(@"
            INSERT INTO AuditLogs (UserId, Action, TableName, RecordId)
            VALUES (@userId, @action, 'SalesTransactions', @recordId)", connection, transaction);

        cmd.Parameters.AddWithValue("@userId", userId);
        cmd.Parameters.AddWithValue("@action", $"Create sale {invoiceNumber}");
        cmd.Parameters.AddWithValue("@recordId", salesId);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<SalesHistoryResponseDto> GetHistoryAsync(SalesHistoryFilterDto filter)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (filter.DateFrom.HasValue)
        {
            where.Add("CAST(S.TransactionDate AS DATE) >= @dateFrom");
            cmd.Parameters.AddWithValue("@dateFrom", filter.DateFrom.Value.Date);
        }

        if (filter.DateTo.HasValue)
        {
            where.Add("CAST(S.TransactionDate AS DATE) <= @dateTo");
            cmd.Parameters.AddWithValue("@dateTo", filter.DateTo.Value.Date);
        }

        if (!string.IsNullOrWhiteSpace(filter.InvoiceNumber))
        {
            where.Add("S.InvoiceNumber LIKE @invoice");
            cmd.Parameters.AddWithValue("@invoice", $"%{filter.InvoiceNumber.Trim()}%");
        }

        if (filter.CustomerId.HasValue)
        {
            where.Add("S.CustomerId = @customerId");
            cmd.Parameters.AddWithValue("@customerId", filter.CustomerId.Value);
        }

        if (filter.OutletId.HasValue)
        {
            where.Add("S.OutletId = @outletId");
            cmd.Parameters.AddWithValue("@outletId", filter.OutletId.Value);
        }

        if (filter.UserId.HasValue)
        {
            where.Add("S.UserId = @userId");
            cmd.Parameters.AddWithValue("@userId", filter.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.PaymentMethod))
        {
            where.Add("S.PaymentMethod = @paymentMethod");
            cmd.Parameters.AddWithValue("@paymentMethod", filter.PaymentMethod);
        }

        var whereClause = string.Join(" AND ", where);

        cmd.CommandText = $@"
            SELECT
                S.Id, S.InvoiceNumber, S.TransactionDate,
                S.CustomerId, ISNULL(C.CustomerName, 'Walk-in'),
                S.UserId, ISNULL(U.FullName, ''),
                S.OutletId, ISNULL(O.OutletName, ''),
                S.SubTotal, S.Discount, S.Tax, S.GrandTotal,
                S.PaymentMethod, S.PaidAmount, S.ChangeAmount,
                (SELECT COUNT(1) FROM SalesTransactionDetails D WHERE D.SalesTransactionId = S.Id)
            FROM SalesTransactions S
            LEFT JOIN Customers C ON S.CustomerId = C.Id
            LEFT JOIN Users U ON S.UserId = U.Id
            LEFT JOIN Outlets O ON S.OutletId = O.Id
            WHERE {whereClause}
            ORDER BY S.TransactionDate DESC";

        var transactions = new List<SalesTransactionListItemDto>();
        decimal totalGrand = 0;

        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var grandTotal = reader.GetDecimal(12);
                totalGrand += grandTotal;
                transactions.Add(new SalesTransactionListItemDto
                {
                    Id = reader.GetInt64(0),
                    InvoiceNumber = reader.GetString(1),
                    TransactionDate = reader.GetDateTime(2),
                    CustomerId = reader.IsDBNull(3) ? null : reader.GetInt32(3),
                    CustomerName = reader.GetString(4),
                    UserId = reader.GetInt32(5),
                    CashierName = reader.GetString(6),
                    OutletId = reader.GetInt32(7),
                    OutletName = reader.GetString(8),
                    SubTotal = reader.GetDecimal(9),
                    Discount = reader.GetDecimal(10),
                    Tax = reader.GetDecimal(11),
                    GrandTotal = grandTotal,
                    PaymentMethod = reader.IsDBNull(13) ? "" : reader.GetString(13),
                    PaidAmount = reader.GetDecimal(14),
                    ChangeAmount = reader.GetDecimal(15),
                    ItemCount = reader.GetInt32(16)
                });
            }
        }

        return new SalesHistoryResponseDto
        {
            Transactions = transactions,
            TotalCount = transactions.Count,
            TotalGrandTotal = totalGrand
        };
    }

    public async Task<SalesTransactionDetailDto?> GetTransactionByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        SalesTransactionDetailDto? header = null;

        await using (var cmd = new SqlCommand(@"
            SELECT
                S.Id, S.InvoiceNumber, S.TransactionDate,
                S.CustomerId, ISNULL(C.CustomerName, 'Walk-in'), C.PhoneNumber,
                S.UserId, ISNULL(U.FullName, ''), ISNULL(U.Username, ''),
                S.OutletId, ISNULL(O.OutletName, ''), O.Address,
                S.SubTotal, S.Discount, S.Tax, S.GrandTotal,
                S.PaymentMethod, S.PaidAmount, S.ChangeAmount
            FROM SalesTransactions S
            LEFT JOIN Customers C ON S.CustomerId = C.Id
            LEFT JOIN Users U ON S.UserId = U.Id
            LEFT JOIN Outlets O ON S.OutletId = O.Id
            WHERE S.Id = @id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            header = new SalesTransactionDetailDto
            {
                Id = reader.GetInt64(0),
                InvoiceNumber = reader.GetString(1),
                TransactionDate = reader.GetDateTime(2),
                CustomerId = reader.IsDBNull(3) ? null : reader.GetInt32(3),
                CustomerName = reader.GetString(4),
                CustomerPhone = reader.IsDBNull(5) ? null : reader.GetString(5),
                UserId = reader.GetInt32(6),
                CashierName = reader.GetString(7),
                CashierUsername = reader.GetString(8),
                OutletId = reader.GetInt32(9),
                OutletName = reader.GetString(10),
                OutletAddress = reader.IsDBNull(11) ? null : reader.GetString(11),
                SubTotal = reader.GetDecimal(12),
                Discount = reader.GetDecimal(13),
                Tax = reader.GetDecimal(14),
                GrandTotal = reader.GetDecimal(15),
                PaymentMethod = reader.IsDBNull(16) ? "" : reader.GetString(16),
                PaidAmount = reader.GetDecimal(17),
                ChangeAmount = reader.GetDecimal(18)
            };
        }

        var items = new List<SalesTransactionDetailItemDto>();
        await using (var cmd = new SqlCommand(@"
            SELECT
                D.Id, D.ProductId, P.ProductCode, P.ProductName, P.Unit,
                D.Qty, D.Price, D.Discount, D.Total
            FROM SalesTransactionDetails D
            INNER JOIN Products P ON D.ProductId = P.Id
            WHERE D.SalesTransactionId = @id
            ORDER BY D.Id", connection))
        {
            cmd.Parameters.AddWithValue("@id", id);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                items.Add(new SalesTransactionDetailItemDto
                {
                    DetailId = reader.GetInt64(0),
                    ProductId = reader.GetInt32(1),
                    ProductCode = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    ProductName = reader.GetString(3),
                    Unit = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Qty = reader.GetInt32(5),
                    Price = reader.GetDecimal(6),
                    Discount = reader.GetDecimal(7),
                    Total = reader.GetDecimal(8)
                });
            }
        }

        header!.Items = items;
        return header;
    }
}
