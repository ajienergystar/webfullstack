using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class MembershipLevelRepository : IMembershipLevelRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public MembershipLevelRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<MembershipLevelListResponseDto> GetListAsync(string? search, bool? isActive)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var conditions = new List<string>();
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add("(L.LevelName LIKE @search OR L.Description LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (isActive.HasValue)
        {
            conditions.Add("L.IsActive = @isActive");
            cmd.Parameters.AddWithValue("@isActive", isActive.Value);
        }

        var where = conditions.Count > 0 ? $"WHERE {string.Join(" AND ", conditions)}" : "";

        cmd.CommandText = $@"
            SELECT L.Id, L.LevelName, L.MinLoyaltyPoint, L.DiscountPercent, L.Description,
                   L.SortOrder, L.IsActive,
                   (SELECT COUNT(*) FROM Memberships M WHERE M.MemberLevel = L.LevelName) AS MemberCount
            FROM MembershipLevels L
            {where}
            ORDER BY L.SortOrder, L.MinLoyaltyPoint, L.LevelName";

        var levels = new List<MembershipLevelListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                levels.Add(MapItem(reader));
            }
        }

        return new MembershipLevelListResponseDto
        {
            Levels = levels,
            TotalCount = levels.Count,
            ActiveCount = levels.Count(l => l.IsActive)
        };
    }

    public async Task<MembershipLevelListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT L.Id, L.LevelName, L.MinLoyaltyPoint, L.DiscountPercent, L.Description,
                   L.SortOrder, L.IsActive,
                   (SELECT COUNT(*) FROM Memberships M WHERE M.MemberLevel = L.LevelName) AS MemberCount
            FROM MembershipLevels L
            WHERE L.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapItem(reader);
    }

    public async Task<List<string>> GetActiveLevelNamesAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT LevelName
            FROM MembershipLevels
            WHERE IsActive = 1
            ORDER BY SortOrder, MinLoyaltyPoint, LevelName", connection);

        var names = new List<string>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            names.Add(reader.GetString(0));
        }
        return names;
    }

    public async Task<MembershipLevelMutationResponseDto> CreateAsync(
        CreateMembershipLevelRequestDto request)
    {
        var name = request.LevelName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await EnsureUniqueNameAsync(connection, name, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO MembershipLevels
                (LevelName, MinLoyaltyPoint, DiscountPercent, Description, SortOrder, IsActive)
            OUTPUT INSERTED.Id
            VALUES (@name, @minPoint, @discount, @desc, @sort, @active)", connection);
        AddParams(cmd, request, name);

        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new MembershipLevelMutationResponseDto { Id = id, LevelName = name };
    }

    public async Task<MembershipLevelMutationResponseDto> UpdateAsync(
        int id, UpdateMembershipLevelRequestDto request)
    {
        var name = request.LevelName.Trim();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var existing = await GetLevelNameByIdAsync(connection, id)
            ?? throw new InvalidOperationException("Level membership tidak ditemukan.");

        await EnsureUniqueNameAsync(connection, name, id);

        await using var cmd = new SqlCommand(@"
            UPDATE MembershipLevels SET
                LevelName = @name,
                MinLoyaltyPoint = @minPoint,
                DiscountPercent = @discount,
                Description = @desc,
                SortOrder = @sort,
                IsActive = @active
            WHERE Id = @id", connection);
        AddParams(cmd, request, name);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        if (!string.Equals(existing, name, StringComparison.OrdinalIgnoreCase))
        {
            await using var syncCmd = new SqlCommand(@"
                UPDATE Memberships SET MemberLevel = @newName WHERE MemberLevel = @oldName",
                connection);
            syncCmd.Parameters.AddWithValue("@newName", name);
            syncCmd.Parameters.AddWithValue("@oldName", existing);
            await syncCmd.ExecuteNonQueryAsync();
        }

        return new MembershipLevelMutationResponseDto { Id = id, LevelName = name };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        var levelName = await GetLevelNameByIdAsync(connection, id)
            ?? throw new InvalidOperationException("Level membership tidak ditemukan.");

        await using var countCmd = new SqlCommand(
            "SELECT COUNT(*) FROM Memberships WHERE MemberLevel = @name", connection);
        countCmd.Parameters.AddWithValue("@name", levelName);
        var memberCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());
        if (memberCount > 0)
            throw new InvalidOperationException(
                $"Level \"{levelName}\" masih dipakai {memberCount} membership.");

        await using var cmd = new SqlCommand("DELETE FROM MembershipLevels WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static MembershipLevelListItemDto MapItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        LevelName = reader.GetString(1),
        MinLoyaltyPoint = reader.GetInt32(2),
        DiscountPercent = reader.GetDecimal(3),
        Description = reader.IsDBNull(4) ? null : reader.GetString(4),
        SortOrder = reader.GetInt32(5),
        IsActive = reader.GetBoolean(6),
        MemberCount = reader.GetInt32(7)
    };

    private static void AddParams(SqlCommand cmd, CreateMembershipLevelRequestDto request, string name)
    {
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@minPoint", request.MinLoyaltyPoint);
        cmd.Parameters.AddWithValue("@discount", request.DiscountPercent);
        cmd.Parameters.AddWithValue("@desc",
            string.IsNullOrWhiteSpace(request.Description) ? DBNull.Value : request.Description.Trim());
        cmd.Parameters.AddWithValue("@sort", request.SortOrder);
        cmd.Parameters.AddWithValue("@active", request.IsActive);
    }

    private static async Task<string?> GetLevelNameByIdAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand(
            "SELECT LevelName FROM MembershipLevels WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        return await cmd.ExecuteScalarAsync() as string;
    }

    private static async Task EnsureUniqueNameAsync(
        SqlConnection connection, string name, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM MembershipLevels
            WHERE LevelName = @name AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Level \"{name}\" sudah terdaftar.");
    }
}
