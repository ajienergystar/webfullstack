using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class PosRoleRepository : IPosRoleRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public PosRoleRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<PosRoleFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var permissions = new List<PosPermissionDto>();

        await using var cmd = new SqlCommand(
            "SELECT Id, PermissionName FROM Permissions ORDER BY PermissionName", connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            permissions.Add(new PosPermissionDto
            {
                Id = reader.GetInt32(0),
                PermissionName = reader.GetString(1)
            });
        }

        return new PosRoleFormDataDto { Permissions = permissions };
    }

    public async Task<PosRoleListResponseDto> GetAllAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var roles = new List<PosRoleListItemDto>();

        await using (var cmd = new SqlCommand(@"
            SELECT R.Id, R.RoleName,
                (SELECT COUNT(1) FROM RolePermissions RP WHERE RP.RoleId = R.Id) AS PermissionCount,
                (SELECT COUNT(1) FROM Users U WHERE U.RoleId = R.Id) AS UserCount
            FROM Roles R
            ORDER BY R.RoleName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                roles.Add(new PosRoleListItemDto
                {
                    Id = reader.GetInt32(0),
                    RoleName = reader.GetString(1),
                    PermissionCount = reader.GetInt32(2),
                    UserCount = reader.GetInt32(3),
                    PermissionNames = []
                });
            }
        }

        if (roles.Count > 0)
        {
            var roleIds = roles.Select(r => r.Id).ToList();
            var placeholders = string.Join(",", roleIds.Select((_, i) => $"@r{i}"));
            await using var permCmd = new SqlCommand($@"
                SELECT RP.RoleId, P.PermissionName
                FROM RolePermissions RP
                INNER JOIN Permissions P ON P.Id = RP.PermissionId
                WHERE RP.RoleId IN ({placeholders})
                ORDER BY P.PermissionName", connection);
            for (var i = 0; i < roleIds.Count; i++)
                permCmd.Parameters.AddWithValue($"@r{i}", roleIds[i]);

            await using var permReader = await permCmd.ExecuteReaderAsync();
            var map = roles.ToDictionary(r => r.Id);
            while (await permReader.ReadAsync())
            {
                var roleId = permReader.GetInt32(0);
                map[roleId].PermissionNames.Add(permReader.GetString(1));
            }
        }

        return new PosRoleListResponseDto
        {
            Roles = roles,
            TotalCount = roles.Count
        };
    }

    public async Task<PosRoleDetailDto?> GetByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();

        await using var cmd = new SqlCommand(
            "SELECT Id, RoleName FROM Roles WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        var detail = new PosRoleDetailDto
        {
            Id = reader.GetInt32(0),
            RoleName = reader.GetString(1),
            PermissionIds = []
        };
        await reader.CloseAsync();

        await using var permCmd = new SqlCommand(
            "SELECT PermissionId FROM RolePermissions WHERE RoleId = @id ORDER BY PermissionId",
            connection);
        permCmd.Parameters.AddWithValue("@id", id);
        await using var permReader = await permCmd.ExecuteReaderAsync();
        while (await permReader.ReadAsync())
            detail.PermissionIds.Add(permReader.GetInt32(0));

        return detail;
    }

    public async Task<bool> RoleNameExistsAsync(string roleName, int? excludeId = null)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = "SELECT COUNT(1) FROM Roles WHERE LOWER(RoleName) = LOWER(@roleName)";
        if (excludeId.HasValue)
            sql += " AND Id <> @excludeId";

        await using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@roleName", roleName);
        if (excludeId.HasValue)
            cmd.Parameters.AddWithValue("@excludeId", excludeId.Value);

        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<bool> AllPermissionsExistAsync(IEnumerable<int> permissionIds)
    {
        var ids = permissionIds.Distinct().ToList();
        if (ids.Count == 0) return true;

        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var placeholders = string.Join(",", ids.Select((_, i) => $"@p{i}"));
        await using var cmd = new SqlCommand(
            $"SELECT COUNT(1) FROM Permissions WHERE Id IN ({placeholders})", connection);
        for (var i = 0; i < ids.Count; i++)
            cmd.Parameters.AddWithValue($"@p{i}", ids[i]);

        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) == ids.Count;
    }

    public async Task<int> GetUserCountByRoleIdAsync(int roleId)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM Users WHERE RoleId = @id", connection);
        cmd.Parameters.AddWithValue("@id", roleId);
        var count = await cmd.ExecuteScalarAsync();
        return count is null ? 0 : Convert.ToInt32(count);
    }

    public async Task<int> CreateAsync(CreatePosRoleRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            await using var insertCmd = new SqlCommand(@"
                INSERT INTO Roles (RoleName)
                OUTPUT INSERTED.Id
                VALUES (@roleName)", connection, transaction);
            insertCmd.Parameters.AddWithValue("@roleName", request.RoleName.Trim());
            var roleId = Convert.ToInt32(await insertCmd.ExecuteScalarAsync());

            await InsertRolePermissionsAsync(connection, transaction, roleId, request.PermissionIds);
            await transaction.CommitAsync();
            return roleId;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task UpdateAsync(int id, UpdatePosRoleRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            await using var updateCmd = new SqlCommand(
                "UPDATE Roles SET RoleName = @roleName WHERE Id = @id",
                connection, transaction);
            updateCmd.Parameters.AddWithValue("@id", id);
            updateCmd.Parameters.AddWithValue("@roleName", request.RoleName.Trim());
            await updateCmd.ExecuteNonQueryAsync();

            await using var deleteCmd = new SqlCommand(
                "DELETE FROM RolePermissions WHERE RoleId = @id", connection, transaction);
            deleteCmd.Parameters.AddWithValue("@id", id);
            await deleteCmd.ExecuteNonQueryAsync();

            await InsertRolePermissionsAsync(connection, transaction, id, request.PermissionIds);
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task DeleteAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();

        try
        {
            await using var deletePerms = new SqlCommand(
                "DELETE FROM RolePermissions WHERE RoleId = @id", connection, transaction);
            deletePerms.Parameters.AddWithValue("@id", id);
            await deletePerms.ExecuteNonQueryAsync();

            await using var deleteRole = new SqlCommand(
                "DELETE FROM Roles WHERE Id = @id", connection, transaction);
            deleteRole.Parameters.AddWithValue("@id", id);
            await deleteRole.ExecuteNonQueryAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static async Task InsertRolePermissionsAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        int roleId,
        IEnumerable<int> permissionIds)
    {
        foreach (var permissionId in permissionIds.Distinct())
        {
            await using var cmd = new SqlCommand(@"
                INSERT INTO RolePermissions (RoleId, PermissionId)
                VALUES (@roleId, @permissionId)", connection, transaction);
            cmd.Parameters.AddWithValue("@roleId", roleId);
            cmd.Parameters.AddWithValue("@permissionId", permissionId);
            await cmd.ExecuteNonQueryAsync();
        }
    }
}
