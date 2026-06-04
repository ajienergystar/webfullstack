using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class ExpenseRepository : IExpenseRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public ExpenseRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<ExpenseListResponseDto> GetListAsync(string? search, DateTime? dateFrom, DateTime? dateTo)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var expenses = new List<ExpenseListItemDto>();
        var sql = @"
            SELECT Id, ExpenseName, Amount, ExpenseDate, Notes
            FROM Expenses
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(search))
            sql += " AND (ExpenseName LIKE @search OR Notes LIKE @search)";
        if (dateFrom.HasValue)
            sql += " AND ExpenseDate >= @dateFrom";
        if (dateTo.HasValue)
            sql += " AND ExpenseDate < @dateTo";

        sql += " ORDER BY ExpenseDate DESC, Id DESC";

        await using var cmd = new SqlCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        if (dateFrom.HasValue)
            cmd.Parameters.AddWithValue("@dateFrom", dateFrom.Value);
        if (dateTo.HasValue)
            cmd.Parameters.AddWithValue("@dateTo", dateTo.Value);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            expenses.Add(MapExpense(reader));
        }

        return new ExpenseListResponseDto
        {
            TotalCount = expenses.Count,
            TotalAmount = expenses.Sum(e => e.Amount),
            Expenses = expenses
        };
    }

    public async Task<ExpenseListItemDto?> GetByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT Id, ExpenseName, Amount, ExpenseDate, Notes
            FROM Expenses WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? MapExpense(reader) : null;
    }

    public async Task<long> CreateAsync(CreateExpenseRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO Expenses (ExpenseName, Amount, ExpenseDate, Notes)
            OUTPUT INSERTED.Id
            VALUES (@name, @amount, @date, @notes)", connection);
        cmd.Parameters.AddWithValue("@name", request.ExpenseName.Trim());
        cmd.Parameters.AddWithValue("@amount", request.Amount);
        cmd.Parameters.AddWithValue("@date", request.ExpenseDate);
        cmd.Parameters.AddWithValue("@notes", (object?)request.Notes?.Trim() ?? DBNull.Value);

        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt64(result);
    }

    public async Task UpdateAsync(long id, UpdateExpenseRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            UPDATE Expenses
            SET ExpenseName = @name, Amount = @amount, ExpenseDate = @date, Notes = @notes
            WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@name", request.ExpenseName.Trim());
        cmd.Parameters.AddWithValue("@amount", request.Amount);
        cmd.Parameters.AddWithValue("@date", request.ExpenseDate);
        cmd.Parameters.AddWithValue("@notes", (object?)request.Notes?.Trim() ?? DBNull.Value);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) throw new InvalidOperationException("Pengeluaran tidak ditemukan.");
    }

    public async Task DeleteAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand("DELETE FROM Expenses WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) throw new InvalidOperationException("Pengeluaran tidak ditemukan.");
    }

    private static ExpenseListItemDto MapExpense(SqlDataReader reader) => new()
    {
        Id = reader.GetInt64(0),
        ExpenseName = reader.IsDBNull(1) ? "" : reader.GetString(1),
        Amount = reader.GetDecimal(2),
        ExpenseDate = reader.GetDateTime(3),
        Notes = reader.IsDBNull(4) ? null : reader.GetString(4)
    };
}
