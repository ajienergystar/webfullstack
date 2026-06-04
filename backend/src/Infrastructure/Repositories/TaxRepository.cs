using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class TaxRepository : ITaxRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public TaxRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<TaxListResponseDto> GetListAsync(string? search, string? taxType, bool? isActive)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var taxes = new List<TaxListItemDto>();
        var sql = @"
            SELECT Id, TaxCode, TaxName, TaxType, TaxRate, IsInclusive, IsDefault, IsActive, Description, CreatedAt
            FROM Taxes
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(search))
            sql += " AND (TaxCode LIKE @search OR TaxName LIKE @search OR Description LIKE @search)";
        if (!string.IsNullOrWhiteSpace(taxType))
            sql += " AND TaxType = @taxType";
        if (isActive.HasValue)
            sql += " AND IsActive = @isActive";

        sql += " ORDER BY IsDefault DESC, TaxName ASC";

        await using var cmd = new SqlCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        if (!string.IsNullOrWhiteSpace(taxType))
            cmd.Parameters.AddWithValue("@taxType", taxType.Trim());
        if (isActive.HasValue)
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            taxes.Add(MapTax(reader));
        }

        return new TaxListResponseDto
        {
            TotalCount = taxes.Count,
            ActiveCount = taxes.Count(t => t.IsActive),
            Taxes = taxes
        };
    }

    public async Task<TaxListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT Id, TaxCode, TaxName, TaxType, TaxRate, IsInclusive, IsDefault, IsActive, Description, CreatedAt
            FROM Taxes WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? MapTax(reader) : null;
    }

    public async Task<int> CreateAsync(CreateTaxRequestDto request)
    {
        if (request.IsDefault)
            await ClearDefaultExceptAsync(null);

        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            INSERT INTO Taxes (TaxCode, TaxName, TaxType, TaxRate, IsInclusive, IsDefault, IsActive, Description)
            OUTPUT INSERTED.Id
            VALUES (@code, @name, @type, @rate, @inclusive, @isDefault, @active, @desc)", connection);
        AddParams(cmd, request.TaxCode, request.TaxName, request.TaxType, request.TaxRate,
            request.IsInclusive, request.IsDefault, request.IsActive, request.Description);

        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    public async Task UpdateAsync(int id, UpdateTaxRequestDto request)
    {
        if (request.IsDefault)
            await ClearDefaultExceptAsync(id);

        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            UPDATE Taxes
            SET TaxCode = @code, TaxName = @name, TaxType = @type, TaxRate = @rate,
                IsInclusive = @inclusive, IsDefault = @isDefault, IsActive = @active, Description = @desc
            WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        AddParams(cmd, request.TaxCode, request.TaxName, request.TaxType, request.TaxRate,
            request.IsInclusive, request.IsDefault, request.IsActive, request.Description);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) throw new InvalidOperationException("Data pajak tidak ditemukan.");
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand("DELETE FROM Taxes WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        var rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0) throw new InvalidOperationException("Data pajak tidak ditemukan.");
    }

    public async Task ClearDefaultExceptAsync(int? exceptId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = "UPDATE Taxes SET IsDefault = 0 WHERE IsDefault = 1";
        if (exceptId.HasValue)
            sql += " AND Id <> @id";

        await using var cmd = new SqlCommand(sql, connection);
        if (exceptId.HasValue)
            cmd.Parameters.AddWithValue("@id", exceptId.Value);
        await cmd.ExecuteNonQueryAsync();
    }

    private static void AddParams(SqlCommand cmd, string code, string name, string type, decimal rate,
        bool inclusive, bool isDefault, bool active, string? desc)
    {
        cmd.Parameters.AddWithValue("@code", code.Trim());
        cmd.Parameters.AddWithValue("@name", name.Trim());
        cmd.Parameters.AddWithValue("@type", type.Trim());
        cmd.Parameters.AddWithValue("@rate", rate);
        cmd.Parameters.AddWithValue("@inclusive", inclusive);
        cmd.Parameters.AddWithValue("@isDefault", isDefault);
        cmd.Parameters.AddWithValue("@active", active);
        cmd.Parameters.AddWithValue("@desc", (object?)desc?.Trim() ?? DBNull.Value);
    }

    private static TaxListItemDto MapTax(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        TaxCode = reader.GetString(1),
        TaxName = reader.GetString(2),
        TaxType = reader.GetString(3),
        TaxRate = reader.GetDecimal(4),
        IsInclusive = reader.GetBoolean(5),
        IsDefault = reader.GetBoolean(6),
        IsActive = reader.GetBoolean(7),
        Description = reader.IsDBNull(8) ? null : reader.GetString(8),
        CreatedAt = reader.GetDateTime(9)
    };
}
