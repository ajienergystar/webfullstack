using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class CustomerRepository : ICustomerRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public CustomerRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<CustomerListResponseDto> GetListAsync(string? search)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = "";
        var cmd = new SqlCommand { Connection = connection };
        if (!string.IsNullOrWhiteSpace(search))
        {
            where = @"WHERE C.CustomerName LIKE @search OR C.PhoneNumber LIKE @search
                      OR C.Address LIKE @search";
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        cmd.CommandText = $@"
            SELECT C.Id, C.CustomerName, C.PhoneNumber, C.Address, C.LoyaltyPoint,
                   (SELECT COUNT(1) FROM SalesTransactions S WHERE S.CustomerId = C.Id)
                 + (SELECT COUNT(1) FROM HeldTransactions H WHERE H.CustomerId = C.Id) AS TransactionCount
            FROM Customers C
            {where}
            ORDER BY C.CustomerName";

        var customers = new List<CustomerListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                customers.Add(MapItem(reader));
            }
        }

        return new CustomerListResponseDto
        {
            Customers = customers,
            TotalCount = customers.Count,
            TotalLoyaltyPoints = customers.Sum(c => c.LoyaltyPoint)
        };
    }

    public async Task<CustomerListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT C.Id, C.CustomerName, C.PhoneNumber, C.Address, C.LoyaltyPoint,
                   (SELECT COUNT(1) FROM SalesTransactions S WHERE S.CustomerId = C.Id)
                 + (SELECT COUNT(1) FROM HeldTransactions H WHERE H.CustomerId = C.Id) AS TransactionCount
            FROM Customers C
            WHERE C.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapItem(reader);
    }

    public async Task<CustomerMutationResponseDto> CreateAsync(CreateCustomerRequestDto request)
    {
        var name = request.CustomerName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            await EnsureUniquePhoneAsync(connection, request.PhoneNumber.Trim(), null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO Customers (CustomerName, PhoneNumber, Address, LoyaltyPoint)
            OUTPUT INSERTED.Id
            VALUES (@name, @phone, @address, @loyalty)", connection);
        AddParams(cmd, request, name);

        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new CustomerMutationResponseDto { Id = id, CustomerName = name };
    }

    public async Task<CustomerMutationResponseDto> UpdateAsync(int id, UpdateCustomerRequestDto request)
    {
        var name = request.CustomerName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Pelanggan tidak ditemukan.");

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            await EnsureUniquePhoneAsync(connection, request.PhoneNumber.Trim(), id);

        await using var cmd = new SqlCommand(@"
            UPDATE Customers SET
                CustomerName = @name,
                PhoneNumber = @phone,
                Address = @address,
                LoyaltyPoint = @loyalty
            WHERE Id = @id", connection);
        AddParams(cmd, request, name);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new CustomerMutationResponseDto { Id = id, CustomerName = name };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Pelanggan tidak ditemukan.");

        var usageCount = await CountUsageAsync(connection, id);
        if (usageCount > 0)
            throw new InvalidOperationException(
                $"Pelanggan masih dipakai pada {usageCount} transaksi penjualan/hold.");

        await using var cmd = new SqlCommand("DELETE FROM Customers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static CustomerListItemDto MapItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        CustomerName = reader.IsDBNull(1) ? "" : reader.GetString(1),
        PhoneNumber = reader.IsDBNull(2) ? null : reader.GetString(2),
        Address = reader.IsDBNull(3) ? null : reader.GetString(3),
        LoyaltyPoint = reader.GetInt32(4),
        TransactionCount = reader.GetInt32(5)
    };

    private static void AddParams(SqlCommand cmd, CreateCustomerRequestDto request, string name)
    {
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@phone",
            string.IsNullOrWhiteSpace(request.PhoneNumber) ? DBNull.Value : request.PhoneNumber.Trim());
        cmd.Parameters.AddWithValue("@address",
            string.IsNullOrWhiteSpace(request.Address) ? DBNull.Value : request.Address.Trim());
        cmd.Parameters.AddWithValue("@loyalty", request.LoyaltyPoint);
    }

    private static async Task<bool> ExistsAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM Customers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task<int> CountUsageAsync(SqlConnection connection, int customerId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT
                (SELECT COUNT(1) FROM SalesTransactions WHERE CustomerId = @id)
              + (SELECT COUNT(1) FROM HeldTransactions WHERE CustomerId = @id)", connection);
        cmd.Parameters.AddWithValue("@id", customerId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private static async Task EnsureUniquePhoneAsync(
        SqlConnection connection, string phone, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Customers
            WHERE PhoneNumber = @phone AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@phone", phone);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Nomor telepon '{phone}' sudah terdaftar.");
    }
}
