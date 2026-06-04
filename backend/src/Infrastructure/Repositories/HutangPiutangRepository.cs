using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class HutangPiutangRepository : IHutangPiutangRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public HutangPiutangRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<HutangPiutangListResponseDto> GetListAsync(
        string? search, string? type, string? status, int? customerId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var conditions = new List<string>();
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add(@"(H.ReferenceNumber LIKE @search OR C.CustomerName LIKE @search
                OR C.PhoneNumber LIKE @search OR H.Description LIKE @search OR H.Notes LIKE @search
                OR S.InvoiceNumber LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            conditions.Add("H.Type = @type");
            cmd.Parameters.AddWithValue("@type", type.Trim().ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            conditions.Add("H.Status = @status");
            cmd.Parameters.AddWithValue("@status", status.Trim().ToUpperInvariant());
        }

        if (customerId.HasValue && customerId.Value > 0)
        {
            conditions.Add("H.CustomerId = @customerId");
            cmd.Parameters.AddWithValue("@customerId", customerId.Value);
        }

        var where = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";

        cmd.CommandText = $@"
            SELECT H.Id, H.ReferenceNumber, H.CustomerId, C.CustomerName, C.PhoneNumber,
                   H.Type, H.Amount, H.PaidAmount, H.RecordDate, H.DueDate,
                   H.SalesTransactionId, S.InvoiceNumber, H.Status, H.Description, H.Notes
            FROM CustomerHutangPiutang H
            INNER JOIN Customers C ON C.Id = H.CustomerId
            LEFT JOIN SalesTransactions S ON S.Id = H.SalesTransactionId
            {where}
            ORDER BY H.RecordDate DESC, H.ReferenceNumber";

        var records = new List<HutangPiutangListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
                records.Add(MapItem(reader));
        }

        return new HutangPiutangListResponseDto
        {
            Records = records,
            TotalCount = records.Count,
            TotalPiutangBalance = records
                .Where(r => r.Type == "PIUTANG" && r.Status != "CANCELLED")
                .Sum(r => r.Balance),
            TotalHutangBalance = records
                .Where(r => r.Type == "HUTANG" && r.Status != "CANCELLED")
                .Sum(r => r.Balance)
        };
    }

    public async Task<HutangPiutangListItemDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT H.Id, H.ReferenceNumber, H.CustomerId, C.CustomerName, C.PhoneNumber,
                   H.Type, H.Amount, H.PaidAmount, H.RecordDate, H.DueDate,
                   H.SalesTransactionId, S.InvoiceNumber, H.Status, H.Description, H.Notes
            FROM CustomerHutangPiutang H
            INNER JOIN Customers C ON C.Id = H.CustomerId
            LEFT JOIN SalesTransactions S ON S.Id = H.SalesTransactionId
            WHERE H.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapItem(reader);
    }

    public async Task<List<HutangPiutangCustomerOptionDto>> GetCustomersAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT Id, CustomerName, PhoneNumber
            FROM Customers
            ORDER BY CustomerName", connection);

        var list = new List<HutangPiutangCustomerOptionDto>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new HutangPiutangCustomerOptionDto
            {
                Id = reader.GetInt32(0),
                CustomerName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                PhoneNumber = reader.IsDBNull(2) ? null : reader.GetString(2)
            });
        }
        return list;
    }

    public async Task<List<HutangPiutangSalesOptionDto>> GetSalesOptionsAsync(int customerId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT Id, InvoiceNumber, TransactionDate, GrandTotal
            FROM SalesTransactions
            WHERE CustomerId = @customerId
            ORDER BY TransactionDate DESC", connection);
        cmd.Parameters.AddWithValue("@customerId", customerId);

        var list = new List<HutangPiutangSalesOptionDto>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new HutangPiutangSalesOptionDto
            {
                Id = reader.GetInt64(0),
                InvoiceNumber = reader.GetString(1),
                TransactionDate = reader.GetDateTime(2),
                GrandTotal = reader.GetDecimal(3)
            });
        }
        return list;
    }

    public async Task<HutangPiutangMutationResponseDto> CreateAsync(CreateHutangPiutangRequestDto request)
    {
        var reference = request.ReferenceNumber.Trim().ToUpperInvariant();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        await EnsureCustomerExistsAsync(connection, request.CustomerId);
        await EnsureUniqueReferenceAsync(connection, reference, null);
        await EnsureSalesBelongsToCustomerAsync(connection, request.SalesTransactionId, request.CustomerId);

        await using var cmd = new SqlCommand(@"
            INSERT INTO CustomerHutangPiutang (
                ReferenceNumber, CustomerId, Type, Amount, PaidAmount, RecordDate, DueDate,
                SalesTransactionId, Status, Description, Notes)
            OUTPUT INSERTED.Id
            VALUES (
                @ref, @customerId, @type, @amount, @paid, @recordDate, @dueDate,
                @salesId, @status, @description, @notes)", connection);
        AddParams(cmd, request, reference);
        var id = Convert.ToInt64(await cmd.ExecuteScalarAsync());
        return new HutangPiutangMutationResponseDto { Id = id, ReferenceNumber = reference };
    }

    public async Task<HutangPiutangMutationResponseDto> UpdateAsync(
        long id, UpdateHutangPiutangRequestDto request)
    {
        var reference = request.ReferenceNumber.Trim().ToUpperInvariant();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Catatan hutang/piutang tidak ditemukan.");

        await EnsureCustomerExistsAsync(connection, request.CustomerId);
        await EnsureUniqueReferenceAsync(connection, reference, id);
        await EnsureSalesBelongsToCustomerAsync(connection, request.SalesTransactionId, request.CustomerId);

        await using var cmd = new SqlCommand(@"
            UPDATE CustomerHutangPiutang SET
                ReferenceNumber = @ref,
                CustomerId = @customerId,
                Type = @type,
                Amount = @amount,
                PaidAmount = @paid,
                RecordDate = @recordDate,
                DueDate = @dueDate,
                SalesTransactionId = @salesId,
                Status = @status,
                Description = @description,
                Notes = @notes
            WHERE Id = @id", connection);
        AddParams(cmd, request, reference);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new HutangPiutangMutationResponseDto { Id = id, ReferenceNumber = reference };
    }

    public async Task DeleteAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Catatan hutang/piutang tidak ditemukan.");

        await using var cmd = new SqlCommand("DELETE FROM CustomerHutangPiutang WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static HutangPiutangListItemDto MapItem(SqlDataReader reader)
    {
        var amount = reader.GetDecimal(6);
        var paid = reader.GetDecimal(7);
        return new HutangPiutangListItemDto
        {
            Id = reader.GetInt64(0),
            ReferenceNumber = reader.GetString(1),
            CustomerId = reader.GetInt32(2),
            CustomerName = reader.IsDBNull(3) ? "" : reader.GetString(3),
            PhoneNumber = reader.IsDBNull(4) ? null : reader.GetString(4),
            Type = reader.GetString(5),
            Amount = amount,
            PaidAmount = paid,
            Balance = amount - paid,
            RecordDate = reader.GetDateTime(8),
            DueDate = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
            SalesTransactionId = reader.IsDBNull(10) ? null : reader.GetInt64(10),
            InvoiceNumber = reader.IsDBNull(11) ? null : reader.GetString(11),
            Status = reader.GetString(12),
            Description = reader.IsDBNull(13) ? null : reader.GetString(13),
            Notes = reader.IsDBNull(14) ? null : reader.GetString(14)
        };
    }

    private static void AddParams(SqlCommand cmd, CreateHutangPiutangRequestDto request, string reference)
    {
        cmd.Parameters.AddWithValue("@ref", reference);
        cmd.Parameters.AddWithValue("@customerId", request.CustomerId);
        cmd.Parameters.AddWithValue("@type", request.Type.Trim().ToUpperInvariant());
        cmd.Parameters.AddWithValue("@amount", request.Amount);
        cmd.Parameters.AddWithValue("@paid", request.PaidAmount);
        cmd.Parameters.AddWithValue("@recordDate", request.RecordDate);
        cmd.Parameters.AddWithValue("@dueDate",
            request.DueDate.HasValue ? request.DueDate.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@salesId",
            request.SalesTransactionId.HasValue ? request.SalesTransactionId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@status", request.Status.Trim().ToUpperInvariant());
        cmd.Parameters.AddWithValue("@description",
            string.IsNullOrWhiteSpace(request.Description) ? DBNull.Value : request.Description.Trim());
        cmd.Parameters.AddWithValue("@notes",
            string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes.Trim());
    }

    private static async Task<bool> ExistsAsync(SqlConnection connection, long id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM CustomerHutangPiutang WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task EnsureCustomerExistsAsync(SqlConnection connection, int customerId)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM Customers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", customerId);
        if (await cmd.ExecuteScalarAsync() is null)
            throw new InvalidOperationException("Pelanggan tidak ditemukan.");
    }

    private static async Task EnsureUniqueReferenceAsync(
        SqlConnection connection, string reference, long? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM CustomerHutangPiutang
            WHERE ReferenceNumber = @ref AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@ref", reference);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Nomor referensi '{reference}' sudah terdaftar.");
    }

    private static async Task EnsureSalesBelongsToCustomerAsync(
        SqlConnection connection, long? salesId, int customerId)
    {
        if (!salesId.HasValue) return;

        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM SalesTransactions
            WHERE Id = @id AND CustomerId = @customerId", connection);
        cmd.Parameters.AddWithValue("@id", salesId.Value);
        cmd.Parameters.AddWithValue("@customerId", customerId);
        if (await cmd.ExecuteScalarAsync() is null)
            throw new InvalidOperationException("Transaksi penjualan tidak valid untuk pelanggan ini.");
    }
}
