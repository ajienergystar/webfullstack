using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class MembershipRepository : IMembershipRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public MembershipRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<MembershipListResponseDto> GetListAsync(
        string? search, string? level, bool? activeOnly)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var conditions = new List<string>();
        var cmd = new SqlCommand { Connection = connection };

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add(@"(M.MemberCode LIKE @search OR C.CustomerName LIKE @search
                OR C.PhoneNumber LIKE @search OR M.Notes LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        if (!string.IsNullOrWhiteSpace(level))
        {
            conditions.Add("M.MemberLevel = @level");
            cmd.Parameters.AddWithValue("@level", level.Trim());
        }

        if (activeOnly == true)
            conditions.Add("M.IsActive = 1");

        var where = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";

        cmd.CommandText = $@"
            SELECT M.Id, M.CustomerId, C.CustomerName, C.PhoneNumber, M.MemberCode, M.MemberLevel,
                   M.JoinDate, M.ExpiredDate, M.IsActive, M.Notes, C.LoyaltyPoint
            FROM Memberships M
            INNER JOIN Customers C ON C.Id = M.CustomerId
            {where}
            ORDER BY M.JoinDate DESC, M.MemberCode";

        var memberships = new List<MembershipListItemDto>();
        await using (cmd)
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
                memberships.Add(MapItem(reader));
        }

        return new MembershipListResponseDto
        {
            Memberships = memberships,
            TotalCount = memberships.Count,
            ActiveCount = memberships.Count(m => m.IsActive)
        };
    }

    public async Task<MembershipListItemDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT M.Id, M.CustomerId, C.CustomerName, C.PhoneNumber, M.MemberCode, M.MemberLevel,
                   M.JoinDate, M.ExpiredDate, M.IsActive, M.Notes, C.LoyaltyPoint
            FROM Memberships M
            INNER JOIN Customers C ON C.Id = M.CustomerId
            WHERE M.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return MapItem(reader);
    }

    public async Task<List<MembershipCustomerOptionDto>> GetAvailableCustomersAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT C.Id, C.CustomerName, C.PhoneNumber
            FROM Customers C
            WHERE NOT EXISTS (SELECT 1 FROM Memberships M WHERE M.CustomerId = C.Id)
            ORDER BY C.CustomerName", connection);

        var list = new List<MembershipCustomerOptionDto>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new MembershipCustomerOptionDto
            {
                Id = reader.GetInt32(0),
                CustomerName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                PhoneNumber = reader.IsDBNull(2) ? null : reader.GetString(2)
            });
        }
        return list;
    }

    public async Task<MembershipMutationResponseDto> CreateAsync(CreateMembershipRequestDto request)
    {
        var code = request.MemberCode.Trim().ToUpperInvariant();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        await EnsureCustomerExistsAsync(connection, request.CustomerId);
        await EnsureCustomerAvailableAsync(connection, request.CustomerId, null);
        await EnsureUniqueCodeAsync(connection, code, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO Memberships (CustomerId, MemberCode, MemberLevel, JoinDate, ExpiredDate, IsActive, Notes)
            OUTPUT INSERTED.Id
            VALUES (@customerId, @code, @level, @joinDate, @expired, @active, @notes)", connection);
        AddParams(cmd, request, code);
        var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return new MembershipMutationResponseDto { Id = id, MemberCode = code };
    }

    public async Task<MembershipMutationResponseDto> UpdateAsync(
        int id, UpdateMembershipRequestDto request)
    {
        var code = request.MemberCode.Trim().ToUpperInvariant();
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Membership tidak ditemukan.");

        await EnsureCustomerExistsAsync(connection, request.CustomerId);
        await EnsureCustomerAvailableAsync(connection, request.CustomerId, id);
        await EnsureUniqueCodeAsync(connection, code, id);

        await using var cmd = new SqlCommand(@"
            UPDATE Memberships SET
                CustomerId = @customerId,
                MemberCode = @code,
                MemberLevel = @level,
                JoinDate = @joinDate,
                ExpiredDate = @expired,
                IsActive = @active,
                Notes = @notes
            WHERE Id = @id", connection);
        AddParams(cmd, request, code);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();

        return new MembershipMutationResponseDto { Id = id, MemberCode = code };
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        if (!await ExistsAsync(connection, id))
            throw new InvalidOperationException("Membership tidak ditemukan.");

        await using var cmd = new SqlCommand("DELETE FROM Memberships WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    private static MembershipListItemDto MapItem(SqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        CustomerId = reader.GetInt32(1),
        CustomerName = reader.IsDBNull(2) ? "" : reader.GetString(2),
        PhoneNumber = reader.IsDBNull(3) ? null : reader.GetString(3),
        MemberCode = reader.GetString(4),
        MemberLevel = reader.GetString(5),
        JoinDate = reader.GetDateTime(6),
        ExpiredDate = reader.IsDBNull(7) ? null : reader.GetDateTime(7),
        IsActive = reader.GetBoolean(8),
        Notes = reader.IsDBNull(9) ? null : reader.GetString(9),
        LoyaltyPoint = reader.GetInt32(10)
    };

    private static void AddParams(SqlCommand cmd, CreateMembershipRequestDto request, string code)
    {
        cmd.Parameters.AddWithValue("@customerId", request.CustomerId);
        cmd.Parameters.AddWithValue("@code", code);
        cmd.Parameters.AddWithValue("@level", request.MemberLevel.Trim());
        cmd.Parameters.AddWithValue("@joinDate", request.JoinDate);
        cmd.Parameters.AddWithValue("@expired",
            request.ExpiredDate.HasValue ? request.ExpiredDate.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@active", request.IsActive);
        cmd.Parameters.AddWithValue("@notes",
            string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes.Trim());
    }

    private static async Task<bool> ExistsAsync(SqlConnection connection, int id)
    {
        await using var cmd = new SqlCommand("SELECT 1 FROM Memberships WHERE Id = @id", connection);
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

    private static async Task EnsureCustomerAvailableAsync(
        SqlConnection connection, int customerId, int? excludeMembershipId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Memberships
            WHERE CustomerId = @customerId AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@customerId", customerId);
        cmd.Parameters.AddWithValue("@exclude",
            excludeMembershipId.HasValue ? excludeMembershipId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException("Pelanggan ini sudah memiliki membership.");
    }

    private static async Task EnsureUniqueCodeAsync(
        SqlConnection connection, string code, int? excludeId)
    {
        await using var cmd = new SqlCommand(@"
            SELECT 1 FROM Memberships
            WHERE MemberCode = @code AND (@exclude IS NULL OR Id <> @exclude)",
            connection);
        cmd.Parameters.AddWithValue("@code", code);
        cmd.Parameters.AddWithValue("@exclude", excludeId.HasValue ? excludeId.Value : DBNull.Value);
        if (await cmd.ExecuteScalarAsync() is not null)
            throw new InvalidOperationException($"Kode member '{code}' sudah terdaftar.");
    }
}
