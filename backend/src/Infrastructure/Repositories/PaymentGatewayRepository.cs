using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class PaymentGatewayRepository : IPaymentGatewayRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public PaymentGatewayRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    private const string SelectColumns = @"
        G.Id, G.GatewayName, G.Provider, G.MerchantId, G.ClientKey, G.ServerKey,
        G.Environment, G.SupportedMethods, G.CallbackUrl, G.OutletId, O.OutletName,
        G.IsDefault, G.IsActive, G.CreatedAt, G.UpdatedAt";

    public async Task<PaymentGatewayListResponseDto> GetListAsync(
        string? search, bool? isActive, string? provider, int? outletId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(G.GatewayName LIKE @search OR G.Provider LIKE @search OR G.MerchantId LIKE @search OR O.OutletName LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (isActive.HasValue)
        {
            where.Add("G.IsActive = @isActive");
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(provider))
        {
            where.Add("G.Provider = @provider");
            cmd.Parameters.AddWithValue("@provider", provider.Trim());
        }

        if (outletId.HasValue)
        {
            where.Add("G.OutletId = @outletId");
            cmd.Parameters.AddWithValue("@outletId", outletId.Value);
        }

        cmd.CommandText = $@"
            SELECT {SelectColumns}
            FROM PaymentGateways G
            LEFT JOIN Outlets O ON O.Id = G.OutletId
            WHERE {string.Join(" AND ", where)}
            ORDER BY G.IsDefault DESC, G.GatewayName";

        var gateways = new List<PaymentGatewayListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                gateways.Add(MapListItem(reader));
            }
        }

        return new PaymentGatewayListResponseDto
        {
            Gateways = gateways,
            TotalCount = gateways.Count,
            ActiveCount = gateways.Count(g => g.IsActive),
            DefaultCount = gateways.Count(g => g.IsDefault)
        };
    }

    public async Task<PaymentGatewayDetailDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand($@"
            SELECT {SelectColumns}
            FROM PaymentGateways G
            LEFT JOIN Outlets O ON O.Id = G.OutletId
            WHERE G.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        var item = MapListItem(reader);
        var serverKey = reader.IsDBNull(5) ? null : reader.GetString(5);
        return new PaymentGatewayDetailDto
        {
            Id = item.Id,
            GatewayName = item.GatewayName,
            Provider = item.Provider,
            MerchantId = item.MerchantId,
            ClientKey = item.ClientKey,
            ServerKey = serverKey,
            ServerKeyMasked = MaskKey(serverKey),
            Environment = item.Environment,
            SupportedMethods = item.SupportedMethods,
            CallbackUrl = item.CallbackUrl,
            OutletId = item.OutletId,
            OutletName = item.OutletName,
            IsDefault = item.IsDefault,
            IsActive = item.IsActive,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        };
    }

    public async Task<PaymentGatewayMutationResponseDto> CreateAsync(CreatePaymentGatewayRequestDto request)
    {
        var name = request.GatewayName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await EnsureUniqueNameAsync(connection, name, null);

        if (request.IsDefault)
            await ClearDefaultAsync(connection, request.OutletId, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO PaymentGateways (
                GatewayName, Provider, MerchantId, ClientKey, ServerKey,
                Environment, SupportedMethods, CallbackUrl, OutletId,
                IsDefault, IsActive, UpdatedAt
            )
            OUTPUT INSERTED.Id
            VALUES (
                @name, @provider, @merchantId, @clientKey, @serverKey,
                @environment, @methods, @callback, @outlet,
                @isDefault, @active, SYSUTCDATETIME()
            )", connection);
        BindMutationParams(cmd, request, name);
        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new PaymentGatewayMutationResponseDto { Id = id, GatewayName = name };
    }

    public async Task<PaymentGatewayMutationResponseDto> UpdateAsync(
        int id, UpdatePaymentGatewayRequestDto request)
    {
        var name = request.GatewayName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Payment gateway tidak ditemukan.");

        await EnsureUniqueNameAsync(connection, name, id);

        if (request.IsDefault)
            await ClearDefaultAsync(connection, request.OutletId, id);

        var existingKey = await GetServerKeyAsync(connection, id);
        var serverKey = string.IsNullOrWhiteSpace(request.ServerKey)
            ? existingKey
            : request.ServerKey.Trim();

        await using var cmd = new SqlCommand(@"
            UPDATE PaymentGateways SET
                GatewayName = @name,
                Provider = @provider,
                MerchantId = @merchantId,
                ClientKey = @clientKey,
                ServerKey = @serverKey,
                Environment = @environment,
                SupportedMethods = @methods,
                CallbackUrl = @callback,
                OutletId = @outlet,
                IsDefault = @isDefault,
                IsActive = @active,
                UpdatedAt = SYSUTCDATETIME()
            WHERE Id = @id", connection);
        BindMutationParams(cmd, request, name);
        cmd.Parameters["@serverKey"].Value =
            string.IsNullOrWhiteSpace(serverKey) ? DBNull.Value : serverKey;
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new PaymentGatewayMutationResponseDto { Id = id, GatewayName = name };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Payment gateway tidak ditemukan.");

        if (await IsDefaultAsync(connection, id))
            throw new InvalidOperationException(
                "Payment gateway default tidak dapat dihapus. Tentukan gateway default lain terlebih dahulu.");

        await using var cmd = new SqlCommand("DELETE FROM PaymentGateways WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static void BindMutationParams(SqlCommand cmd, CreatePaymentGatewayRequestDto request, string name)
    {
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@provider", request.Provider.Trim());
        cmd.Parameters.AddWithValue("@merchantId",
            string.IsNullOrWhiteSpace(request.MerchantId) ? DBNull.Value : request.MerchantId.Trim());
        cmd.Parameters.AddWithValue("@clientKey",
            string.IsNullOrWhiteSpace(request.ClientKey) ? DBNull.Value : request.ClientKey.Trim());
        cmd.Parameters.AddWithValue("@serverKey",
            string.IsNullOrWhiteSpace(request.ServerKey) ? DBNull.Value : request.ServerKey.Trim());
        cmd.Parameters.AddWithValue("@environment", request.Environment.Trim());
        cmd.Parameters.AddWithValue("@methods",
            string.IsNullOrWhiteSpace(request.SupportedMethods) ? DBNull.Value : request.SupportedMethods.Trim());
        cmd.Parameters.AddWithValue("@callback",
            string.IsNullOrWhiteSpace(request.CallbackUrl) ? DBNull.Value : request.CallbackUrl.Trim());
        cmd.Parameters.AddWithValue("@outlet",
            request.OutletId.HasValue ? request.OutletId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@isDefault", request.IsDefault);
        cmd.Parameters.AddWithValue("@active", request.IsActive);
    }

    private static PaymentGatewayListItemDto MapListItem(SqlDataReader reader)
    {
        var serverKey = reader.IsDBNull(5) ? null : reader.GetString(5);
        return new PaymentGatewayListItemDto
        {
            Id = reader.GetInt32(0),
            GatewayName = reader.GetString(1),
            Provider = reader.GetString(2),
            MerchantId = reader.IsDBNull(3) ? null : reader.GetString(3),
            ClientKey = reader.IsDBNull(4) ? null : reader.GetString(4),
            ServerKeyMasked = MaskKey(serverKey),
            Environment = reader.GetString(6),
            SupportedMethods = reader.IsDBNull(7) ? null : reader.GetString(7),
            CallbackUrl = reader.IsDBNull(8) ? null : reader.GetString(8),
            OutletId = reader.IsDBNull(9) ? null : reader.GetInt32(9),
            OutletName = reader.IsDBNull(10) ? null : reader.GetString(10),
            IsDefault = reader.GetBoolean(11),
            IsActive = reader.GetBoolean(12),
            CreatedAt = reader.IsDBNull(13) ? null : reader.GetDateTime(13),
            UpdatedAt = reader.IsDBNull(14) ? null : reader.GetDateTime(14)
        };
    }

    private static string? MaskKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key)) return null;
        if (key.Length <= 8) return "****";
        return $"****{key[^4..]}";
    }

    private static async Task<bool> ExistsAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM PaymentGateways WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task<bool> IsDefaultAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand(
            "SELECT IsDefault FROM PaymentGateways WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        var result = await cmd.ExecuteScalarAsync();
        return result is true or 1;
    }

    private static async Task<string?> GetServerKeyAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand(
            "SELECT ServerKey FROM PaymentGateways WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        var result = await cmd.ExecuteScalarAsync();
        return result is DBNull or null ? null : Convert.ToString(result);
    }

    private static async Task EnsureUniqueNameAsync(
        SqlConnection connection, string name, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM PaymentGateways
            WHERE LOWER(GatewayName) = LOWER(@name) AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Payment gateway '{name}' sudah ada.");
    }

    private static async Task ClearDefaultAsync(
        SqlConnection connection, int? outletId, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            UPDATE PaymentGateways SET IsDefault = 0
            WHERE IsDefault = 1
              AND (@outlet IS NULL OR OutletId = @outlet OR (OutletId IS NULL AND @outlet IS NULL))
              AND (@exclude IS NULL OR Id <> @exclude)", connection);
        cmd.Parameters.AddWithValue("@outlet", outletId.HasValue ? outletId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }
}
