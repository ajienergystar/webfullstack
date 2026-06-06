using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class PrinterRepository : IPrinterRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public PrinterRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    private const string SelectColumns = @"
        P.Id, P.PrinterName, P.ConnectionType, P.IpAddress, P.Port,
        P.PaperWidthMm, P.PrinterPurpose, P.OutletId, O.OutletName,
        P.IsDefault, P.IsActive, P.CreatedAt";

    public async Task<PrinterListResponseDto> GetListAsync(
        string? search, bool? isActive, string? connectionType, int? outletId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(P.PrinterName LIKE @search OR P.IpAddress LIKE @search OR O.OutletName LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (isActive.HasValue)
        {
            where.Add("P.IsActive = @isActive");
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(connectionType))
        {
            where.Add("P.ConnectionType = @connectionType");
            cmd.Parameters.AddWithValue("@connectionType", connectionType.Trim());
        }

        if (outletId.HasValue)
        {
            where.Add("P.OutletId = @outletId");
            cmd.Parameters.AddWithValue("@outletId", outletId.Value);
        }

        cmd.CommandText = $@"
            SELECT {SelectColumns}
            FROM Printers P
            LEFT JOIN Outlets O ON O.Id = P.OutletId
            WHERE {string.Join(" AND ", where)}
            ORDER BY P.IsDefault DESC, P.PrinterName";

        var printers = new List<PrinterListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                printers.Add(MapItem(reader));
            }
        }

        return new PrinterListResponseDto
        {
            Printers = printers,
            TotalCount = printers.Count,
            ActiveCount = printers.Count(p => p.IsActive),
            DefaultCount = printers.Count(p => p.IsDefault)
        };
    }

    public async Task<PrinterListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand($@"
            SELECT {SelectColumns}
            FROM Printers P
            LEFT JOIN Outlets O ON O.Id = P.OutletId
            WHERE P.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapItem(reader);
    }

    public async Task<PrinterMutationResponseDto> CreateAsync(CreatePrinterRequestDto request)
    {
        var name = request.PrinterName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await EnsureUniqueNameAsync(connection, name, null);

        if (request.IsDefault)
            await ClearDefaultAsync(connection, request.OutletId, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO Printers (
                PrinterName, ConnectionType, IpAddress, Port, PaperWidthMm,
                PrinterPurpose, OutletId, IsDefault, IsActive
            )
            OUTPUT INSERTED.Id
            VALUES (
                @name, @conn, @ip, @port, @paper, @purpose, @outlet, @isDefault, @active
            )", connection);
        BindMutationParams(cmd, request, name);
        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new PrinterMutationResponseDto { Id = id, PrinterName = name };
    }

    public async Task<PrinterMutationResponseDto> UpdateAsync(int id, UpdatePrinterRequestDto request)
    {
        var name = request.PrinterName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Printer tidak ditemukan.");

        await EnsureUniqueNameAsync(connection, name, id);

        if (request.IsDefault)
            await ClearDefaultAsync(connection, request.OutletId, id);

        await using var cmd = new SqlCommand(@"
            UPDATE Printers SET
                PrinterName = @name,
                ConnectionType = @conn,
                IpAddress = @ip,
                Port = @port,
                PaperWidthMm = @paper,
                PrinterPurpose = @purpose,
                OutletId = @outlet,
                IsDefault = @isDefault,
                IsActive = @active
            WHERE Id = @id", connection);
        BindMutationParams(cmd, request, name);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new PrinterMutationResponseDto { Id = id, PrinterName = name };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Printer tidak ditemukan.");

        var isDefault = await IsDefaultAsync(connection, id);
        if (isDefault)
            throw new InvalidOperationException(
                "Printer default tidak dapat dihapus. Tentukan printer default lain terlebih dahulu.");

        await using var cmd = new SqlCommand("DELETE FROM Printers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static void BindMutationParams(SqlCommand cmd, CreatePrinterRequestDto request, string name)
    {
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@conn", request.ConnectionType.Trim());
        cmd.Parameters.AddWithValue("@ip",
            string.IsNullOrWhiteSpace(request.IpAddress) ? DBNull.Value : request.IpAddress.Trim());
        cmd.Parameters.AddWithValue("@port",
            string.IsNullOrWhiteSpace(request.Port) ? DBNull.Value : request.Port.Trim());
        cmd.Parameters.AddWithValue("@paper", request.PaperWidthMm);
        cmd.Parameters.AddWithValue("@purpose", request.PrinterPurpose.Trim());
        cmd.Parameters.AddWithValue("@outlet",
            request.OutletId.HasValue ? request.OutletId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@isDefault", request.IsDefault);
        cmd.Parameters.AddWithValue("@active", request.IsActive);
    }

    private static PrinterListItemDto MapItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        PrinterName = reader.GetString(1),
        ConnectionType = reader.GetString(2),
        IpAddress = reader.IsDBNull(3) ? null : reader.GetString(3),
        Port = reader.IsDBNull(4) ? null : reader.GetString(4),
        PaperWidthMm = reader.GetInt32(5),
        PrinterPurpose = reader.GetString(6),
        OutletId = reader.IsDBNull(7) ? null : reader.GetInt32(7),
        OutletName = reader.IsDBNull(8) ? null : reader.GetString(8),
        IsDefault = reader.GetBoolean(9),
        IsActive = reader.GetBoolean(10),
        CreatedAt = reader.IsDBNull(11) ? null : reader.GetDateTime(11)
    };

    private static async Task<bool> ExistsAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM Printers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task<bool> IsDefaultAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand(
            "SELECT IsDefault FROM Printers WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        var result = await cmd.ExecuteScalarAsync();
        return result is true or 1;
    }

    private static async Task EnsureUniqueNameAsync(
        SqlConnection connection, string name, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Printers
            WHERE LOWER(PrinterName) = LOWER(@name) AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Printer '{name}' sudah ada.");
    }

    private static async Task ClearDefaultAsync(
        SqlConnection connection, int? outletId, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            UPDATE Printers SET IsDefault = 0
            WHERE IsDefault = 1
              AND (@outlet IS NULL OR OutletId = @outlet OR (OutletId IS NULL AND @outlet IS NULL))
              AND (@exclude IS NULL OR Id <> @exclude)", connection);
        cmd.Parameters.AddWithValue("@outlet", outletId.HasValue ? outletId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }
}
