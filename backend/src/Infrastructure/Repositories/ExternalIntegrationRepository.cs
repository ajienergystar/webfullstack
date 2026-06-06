using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class ExternalIntegrationRepository : IExternalIntegrationRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public ExternalIntegrationRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    private const string SelectColumns = @"
        I.Id, I.IntegrationName, I.IntegrationType, I.Provider, I.ApiKey, I.ApiSecret,
        I.WebhookUrl, I.BaseUrl, I.SyncDirection, I.LastSyncAt, I.LastSyncStatus,
        I.Notes, I.OutletId, O.OutletName, I.IsActive, I.CreatedAt, I.UpdatedAt";

    public async Task<ExternalIntegrationListResponseDto> GetListAsync(
        string? search, bool? isActive, string? integrationType, string? provider, int? outletId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var where = new List<string> { "1=1" };
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            where.Add("(I.IntegrationName LIKE @search OR I.Provider LIKE @search OR I.Notes LIKE @search OR O.OutletName LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (isActive.HasValue)
        {
            where.Add("I.IsActive = @isActive");
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(integrationType))
        {
            where.Add("I.IntegrationType = @type");
            cmd.Parameters.AddWithValue("@type", integrationType.Trim());
        }

        if (!string.IsNullOrWhiteSpace(provider))
        {
            where.Add("I.Provider = @provider");
            cmd.Parameters.AddWithValue("@provider", provider.Trim());
        }

        if (outletId.HasValue)
        {
            where.Add("I.OutletId = @outletId");
            cmd.Parameters.AddWithValue("@outletId", outletId.Value);
        }

        cmd.CommandText = $@"
            SELECT {SelectColumns}
            FROM ExternalIntegrations I
            LEFT JOIN Outlets O ON O.Id = I.OutletId
            WHERE {string.Join(" AND ", where)}
            ORDER BY I.IsActive DESC, I.IntegrationName";

        var integrations = new List<ExternalIntegrationListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                integrations.Add(MapListItem(reader));
            }
        }

        return new ExternalIntegrationListResponseDto
        {
            Integrations = integrations,
            TotalCount = integrations.Count,
            ActiveCount = integrations.Count(i => i.IsActive),
            SyncedCount = integrations.Count(i => i.LastSyncStatus == "Success")
        };
    }

    public async Task<ExternalIntegrationDetailDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand($@"
            SELECT {SelectColumns}
            FROM ExternalIntegrations I
            LEFT JOIN Outlets O ON O.Id = I.OutletId
            WHERE I.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        var item = MapListItem(reader);
        var apiKey = reader.IsDBNull(4) ? null : reader.GetString(4);
        var apiSecret = reader.IsDBNull(5) ? null : reader.GetString(5);
        return new ExternalIntegrationDetailDto
        {
            Id = item.Id,
            IntegrationName = item.IntegrationName,
            IntegrationType = item.IntegrationType,
            Provider = item.Provider,
            ApiKey = apiKey,
            ApiSecret = apiSecret,
            ApiKeyMasked = MaskKey(apiKey),
            ApiSecretMasked = MaskKey(apiSecret),
            WebhookUrl = item.WebhookUrl,
            BaseUrl = item.BaseUrl,
            SyncDirection = item.SyncDirection,
            LastSyncAt = item.LastSyncAt,
            LastSyncStatus = item.LastSyncStatus,
            Notes = item.Notes,
            OutletId = item.OutletId,
            OutletName = item.OutletName,
            IsActive = item.IsActive,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        };
    }

    public async Task<ExternalIntegrationMutationResponseDto> CreateAsync(
        CreateExternalIntegrationRequestDto request)
    {
        var name = request.IntegrationName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await EnsureUniqueNameAsync(connection, name, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO ExternalIntegrations (
                IntegrationName, IntegrationType, Provider, ApiKey, ApiSecret,
                WebhookUrl, BaseUrl, SyncDirection, Notes, OutletId,
                IsActive, LastSyncStatus, UpdatedAt
            )
            OUTPUT INSERTED.Id
            VALUES (
                @name, @type, @provider, @apiKey, @apiSecret,
                @webhook, @baseUrl, @direction, @notes, @outlet,
                @active, 'Never', SYSUTCDATETIME()
            )", connection);
        BindMutationParams(cmd, request, name);
        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new ExternalIntegrationMutationResponseDto { Id = id, IntegrationName = name };
    }

    public async Task<ExternalIntegrationMutationResponseDto> UpdateAsync(
        int id, UpdateExternalIntegrationRequestDto request)
    {
        var name = request.IntegrationName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Integrasi tidak ditemukan.");

        await EnsureUniqueNameAsync(connection, name, id);

        var existingKey = await GetCredentialAsync(connection, id, "ApiKey");
        var existingSecret = await GetCredentialAsync(connection, id, "ApiSecret");
        var apiKey = string.IsNullOrWhiteSpace(request.ApiKey) ? existingKey : request.ApiKey.Trim();
        var apiSecret = string.IsNullOrWhiteSpace(request.ApiSecret) ? existingSecret : request.ApiSecret.Trim();

        await using var cmd = new SqlCommand(@"
            UPDATE ExternalIntegrations SET
                IntegrationName = @name,
                IntegrationType = @type,
                Provider = @provider,
                ApiKey = @apiKey,
                ApiSecret = @apiSecret,
                WebhookUrl = @webhook,
                BaseUrl = @baseUrl,
                SyncDirection = @direction,
                Notes = @notes,
                OutletId = @outlet,
                IsActive = @active,
                UpdatedAt = SYSUTCDATETIME()
            WHERE Id = @id", connection);
        BindMutationParams(cmd, request, name);
        cmd.Parameters["@apiKey"].Value = string.IsNullOrWhiteSpace(apiKey) ? DBNull.Value : apiKey;
        cmd.Parameters["@apiSecret"].Value = string.IsNullOrWhiteSpace(apiSecret) ? DBNull.Value : apiSecret;
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new ExternalIntegrationMutationResponseDto { Id = id, IntegrationName = name };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Integrasi tidak ditemukan.");

        await using var cmd = new SqlCommand("DELETE FROM ExternalIntegrations WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static void BindMutationParams(SqlCommand cmd, CreateExternalIntegrationRequestDto request, string name)
    {
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@type", request.IntegrationType.Trim());
        cmd.Parameters.AddWithValue("@provider", request.Provider.Trim());
        cmd.Parameters.AddWithValue("@apiKey",
            string.IsNullOrWhiteSpace(request.ApiKey) ? DBNull.Value : request.ApiKey.Trim());
        cmd.Parameters.AddWithValue("@apiSecret",
            string.IsNullOrWhiteSpace(request.ApiSecret) ? DBNull.Value : request.ApiSecret.Trim());
        cmd.Parameters.AddWithValue("@webhook",
            string.IsNullOrWhiteSpace(request.WebhookUrl) ? DBNull.Value : request.WebhookUrl.Trim());
        cmd.Parameters.AddWithValue("@baseUrl",
            string.IsNullOrWhiteSpace(request.BaseUrl) ? DBNull.Value : request.BaseUrl.Trim());
        cmd.Parameters.AddWithValue("@direction", request.SyncDirection.Trim());
        cmd.Parameters.AddWithValue("@notes",
            string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes.Trim());
        cmd.Parameters.AddWithValue("@outlet",
            request.OutletId.HasValue ? request.OutletId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@active", request.IsActive);
    }

    private static ExternalIntegrationListItemDto MapListItem(SqlDataReader reader)
    {
        var apiKey = reader.IsDBNull(4) ? null : reader.GetString(4);
        var apiSecret = reader.IsDBNull(5) ? null : reader.GetString(5);
        return new ExternalIntegrationListItemDto
        {
            Id = reader.GetInt32(0),
            IntegrationName = reader.GetString(1),
            IntegrationType = reader.GetString(2),
            Provider = reader.GetString(3),
            ApiKeyMasked = MaskKey(apiKey),
            ApiSecretMasked = MaskKey(apiSecret),
            WebhookUrl = reader.IsDBNull(6) ? null : reader.GetString(6),
            BaseUrl = reader.IsDBNull(7) ? null : reader.GetString(7),
            SyncDirection = reader.GetString(8),
            LastSyncAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
            LastSyncStatus = reader.IsDBNull(10) ? null : reader.GetString(10),
            Notes = reader.IsDBNull(11) ? null : reader.GetString(11),
            OutletId = reader.IsDBNull(12) ? null : reader.GetInt32(12),
            OutletName = reader.IsDBNull(13) ? null : reader.GetString(13),
            IsActive = reader.GetBoolean(14),
            CreatedAt = reader.IsDBNull(15) ? null : reader.GetDateTime(15),
            UpdatedAt = reader.IsDBNull(16) ? null : reader.GetDateTime(16)
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
        await using var cmd = new SqlCommand("SELECT 1 FROM ExternalIntegrations WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() is not null;
    }

    private static async Task<string?> GetCredentialAsync(SqlConnection connection, int id, string column)
    {
        await using var cmd = new SqlCommand(
            $"SELECT {column} FROM ExternalIntegrations WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        var result = await cmd.ExecuteScalarAsync();
        return result is DBNull or null ? null : Convert.ToString(result);
    }

    private static async Task EnsureUniqueNameAsync(
        SqlConnection connection, string name, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM ExternalIntegrations
            WHERE LOWER(IntegrationName) = LOWER(@name) AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Integrasi '{name}' sudah ada.");
    }
}
