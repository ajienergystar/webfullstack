using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace LatihanASP.Infrastructure.Repositories;

public class CashBankRepository : ICashBankRepository
{
    private readonly IPosSqlConnectionFactory _connectionFactory;

    public CashBankRepository(IPosSqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<CashBankFormDataDto> GetFormDataAsync()
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var outlets = new List<CashBankOutletOptionDto>();
        var users = new List<CashBankUserOptionDto>();
        var accounts = new List<CashAccountOptionDto>();

        await using (var cmd = new SqlCommand(
            "SELECT Id, OutletName FROM Outlets ORDER BY OutletName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                outlets.Add(new CashBankOutletOptionDto
                {
                    Id = reader.GetInt32(0),
                    OutletName = reader.IsDBNull(1) ? "" : reader.GetString(1)
                });
            }
        }

        await using (var cmd = new SqlCommand(@"
            SELECT Id, FullName, Username FROM Users WHERE IsActive = 1 ORDER BY FullName", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                users.Add(new CashBankUserOptionDto
                {
                    Id = reader.GetInt32(0),
                    FullName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                    Username = reader.IsDBNull(2) ? "" : reader.GetString(2)
                });
            }
        }

        await using (var cmd = new SqlCommand(@"
            SELECT Id, AccountCode, AccountName, AccountType, CurrentBalance
            FROM CashAccounts WHERE IsActive = 1 ORDER BY AccountCode", connection))
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                accounts.Add(new CashAccountOptionDto
                {
                    Id = reader.GetInt32(0),
                    AccountCode = reader.GetString(1),
                    AccountName = reader.GetString(2),
                    AccountType = reader.GetString(3),
                    CurrentBalance = reader.GetDecimal(4)
                });
            }
        }

        return new CashBankFormDataDto { Outlets = outlets, Users = users, Accounts = accounts };
    }

    public async Task<CashAccountListResponseDto> GetAccountsAsync(string? search, string? accountType)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var accounts = new List<CashAccountListItemDto>();
        var sql = @"
            SELECT A.Id, A.AccountCode, A.AccountName, A.AccountNumber, A.AccountType, A.BankName,
                   A.OpeningBalance, A.CurrentBalance, A.OutletId, O.OutletName,
                   A.IsDefault, A.IsActive, A.Notes, A.CreatedAt
            FROM CashAccounts A
            LEFT JOIN Outlets O ON A.OutletId = O.Id
            WHERE 1=1";

        if (!string.IsNullOrWhiteSpace(search))
            sql += " AND (A.AccountCode LIKE @search OR A.AccountName LIKE @search OR A.AccountNumber LIKE @search)";
        if (!string.IsNullOrWhiteSpace(accountType))
            sql += " AND A.AccountType = @type";

        sql += " ORDER BY A.IsDefault DESC, A.AccountCode";

        await using var cmd = new SqlCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(search))
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        if (!string.IsNullOrWhiteSpace(accountType))
            cmd.Parameters.AddWithValue("@type", accountType.Trim());

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            accounts.Add(MapAccount(reader));

        return new CashAccountListResponseDto
        {
            Accounts = accounts,
            TotalCount = accounts.Count,
            TotalCashBalance = accounts.Where(a => a.AccountType == "Cash").Sum(a => a.CurrentBalance),
            TotalBankBalance = accounts.Where(a => a.AccountType == "Bank").Sum(a => a.CurrentBalance)
        };
    }

    public async Task<CashAccountListItemDto?> GetAccountByIdAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT A.Id, A.AccountCode, A.AccountName, A.AccountNumber, A.AccountType, A.BankName,
                   A.OpeningBalance, A.CurrentBalance, A.OutletId, O.OutletName,
                   A.IsDefault, A.IsActive, A.Notes, A.CreatedAt
            FROM CashAccounts A
            LEFT JOIN Outlets O ON A.OutletId = O.Id
            WHERE A.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? MapAccount(reader) : null;
    }

    public async Task<bool> AccountCodeExistsAsync(string code, int? excludeId = null)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var sql = "SELECT COUNT(1) FROM CashAccounts WHERE AccountCode = @code";
        if (excludeId.HasValue) sql += " AND Id <> @excludeId";

        await using var cmd = new SqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("@code", code);
        if (excludeId.HasValue) cmd.Parameters.AddWithValue("@excludeId", excludeId.Value);

        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<int> CreateAccountAsync(CreateCashAccountRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        if (request.IsDefault)
            await ClearDefaultAccountAsync(connection, null);

        await using var cmd = new SqlCommand(@"
            INSERT INTO CashAccounts (AccountCode, AccountName, AccountNumber, AccountType, BankName,
                OpeningBalance, CurrentBalance, OutletId, IsDefault, IsActive, Notes)
            OUTPUT INSERTED.Id
            VALUES (@code, @name, @number, @type, @bank, @opening, @opening, @outlet, @isDefault, @isActive, @notes)",
            connection);

        AddAccountParams(cmd, request);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    public async Task UpdateAccountAsync(int id, UpdateCashAccountRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var existing = await GetAccountByIdAsync(id)
            ?? throw new InvalidOperationException("Akun tidak ditemukan.");

        if (request.IsDefault)
            await ClearDefaultAccountAsync(connection, id);

        var balanceDelta = request.OpeningBalance - existing.OpeningBalance;

        await using var cmd = new SqlCommand(@"
            UPDATE CashAccounts
            SET AccountCode = @code, AccountName = @name, AccountNumber = @number,
                AccountType = @type, BankName = @bank, OpeningBalance = @opening,
                CurrentBalance = CurrentBalance + @balanceDelta,
                OutletId = @outlet, IsDefault = @isDefault, IsActive = @isActive, Notes = @notes
            WHERE Id = @id", connection);

        cmd.Parameters.AddWithValue("@id", id);
        AddAccountParams(cmd, request);
        cmd.Parameters.AddWithValue("@balanceDelta", balanceDelta);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task DeleteAccountAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand("DELETE FROM CashAccounts WHERE Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<bool> AccountHasTransactionsAsync(int id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM CashTransactions WHERE CashAccountId = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);
        var count = await cmd.ExecuteScalarAsync();
        return count is not null && Convert.ToInt32(count) > 0;
    }

    public async Task<CashTransactionListResponseDto> GetTransactionsAsync(
        int? accountId, string? transactionType, DateTime? dateFrom, DateTime? dateTo)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var transactions = new List<CashTransactionListItemDto>();
        var sql = @"
            SELECT T.Id, T.CashAccountId, A.AccountCode, A.AccountName, T.TransactionType, T.Amount,
                   T.TransactionDate, T.ReferenceNumber, T.Description, T.UserId, U.FullName,
                   T.OutletId, O.OutletName, T.CreatedAt
            FROM CashTransactions T
            INNER JOIN CashAccounts A ON T.CashAccountId = A.Id
            LEFT JOIN Users U ON T.UserId = U.Id
            LEFT JOIN Outlets O ON T.OutletId = O.Id
            WHERE 1=1";

        if (accountId.HasValue) sql += " AND T.CashAccountId = @accountId";
        if (!string.IsNullOrWhiteSpace(transactionType)) sql += " AND T.TransactionType = @type";
        if (dateFrom.HasValue) sql += " AND T.TransactionDate >= @dateFrom";
        if (dateTo.HasValue) sql += " AND T.TransactionDate < @dateTo";

        sql += " ORDER BY T.TransactionDate DESC, T.Id DESC";

        await using var cmd = new SqlCommand(sql, connection);
        if (accountId.HasValue) cmd.Parameters.AddWithValue("@accountId", accountId.Value);
        if (!string.IsNullOrWhiteSpace(transactionType))
            cmd.Parameters.AddWithValue("@type", transactionType.Trim());
        if (dateFrom.HasValue) cmd.Parameters.AddWithValue("@dateFrom", dateFrom.Value);
        if (dateTo.HasValue) cmd.Parameters.AddWithValue("@dateTo", dateTo.Value);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
            transactions.Add(MapTransaction(reader));

        return new CashTransactionListResponseDto
        {
            Transactions = transactions,
            TotalCount = transactions.Count
        };
    }

    public async Task<CashTransactionListItemDto?> GetTransactionByIdAsync(long id)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var cmd = new SqlCommand(@"
            SELECT T.Id, T.CashAccountId, A.AccountCode, A.AccountName, T.TransactionType, T.Amount,
                   T.TransactionDate, T.ReferenceNumber, T.Description, T.UserId, U.FullName,
                   T.OutletId, O.OutletName, T.CreatedAt
            FROM CashTransactions T
            INNER JOIN CashAccounts A ON T.CashAccountId = A.Id
            LEFT JOIN Users U ON T.UserId = U.Id
            LEFT JOIN Outlets O ON T.OutletId = O.Id
            WHERE T.Id = @id", connection);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? MapTransaction(reader) : null;
    }

    public async Task<long> CreateTransactionAsync(CreateCashTransactionRequestDto request)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();
        try
        {
            await using var cmd = new SqlCommand(@"
                INSERT INTO CashTransactions (CashAccountId, TransactionType, Amount, TransactionDate,
                    ReferenceNumber, Description, UserId, OutletId)
                OUTPUT INSERTED.Id
                VALUES (@accountId, @type, @amount, @date, @ref, @desc, @userId, @outletId)", connection, transaction);

            AddTransactionParams(cmd, request);
            var id = Convert.ToInt64(await cmd.ExecuteScalarAsync());

            await ApplyBalanceChangeAsync(connection, transaction, request.CashAccountId,
                request.TransactionType, request.Amount, 0, "");

            await transaction.CommitAsync();
            return id;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task UpdateTransactionAsync(long id, UpdateCashTransactionRequestDto request,
        decimal previousAmount, string previousType)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var existing = await GetTransactionByIdAsync(id)
            ?? throw new InvalidOperationException("Transaksi tidak ditemukan.");

        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();
        try
        {
            await ReverseBalanceAsync(connection, transaction, existing.CashAccountId, previousType, previousAmount);

            await using var cmd = new SqlCommand(@"
                UPDATE CashTransactions
                SET CashAccountId = @accountId, TransactionType = @type, Amount = @amount,
                    TransactionDate = @date, ReferenceNumber = @ref, Description = @desc,
                    UserId = @userId, OutletId = @outletId
                WHERE Id = @id", connection, transaction);

            cmd.Parameters.AddWithValue("@id", id);
            AddTransactionParams(cmd, request);
            await cmd.ExecuteNonQueryAsync();

            await ApplyBalanceChangeAsync(connection, transaction, request.CashAccountId,
                request.TransactionType, request.Amount, 0, "");

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task DeleteTransactionAsync(long id, decimal amount, string transactionType)
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync();
        var existing = await GetTransactionByIdAsync(id)
            ?? throw new InvalidOperationException("Transaksi tidak ditemukan.");

        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync();
        try
        {
            await ReverseBalanceAsync(connection, transaction, existing.CashAccountId, transactionType, amount);

            await using var cmd = new SqlCommand(
                "DELETE FROM CashTransactions WHERE Id = @id", connection, transaction);
            cmd.Parameters.AddWithValue("@id", id);
            await cmd.ExecuteNonQueryAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static async Task ClearDefaultAccountAsync(SqlConnection connection, int? excludeId)
    {
        var sql = "UPDATE CashAccounts SET IsDefault = 0 WHERE IsDefault = 1";
        if (excludeId.HasValue) sql += " AND Id <> @excludeId";

        await using var cmd = new SqlCommand(sql, connection);
        if (excludeId.HasValue) cmd.Parameters.AddWithValue("@excludeId", excludeId.Value);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task ApplyBalanceChangeAsync(SqlConnection connection, SqlTransaction transaction,
        int accountId, string type, decimal amount, decimal _, string __)
    {
        var delta = type == "IN" ? amount : -amount;
        await using var cmd = new SqlCommand(@"
            UPDATE CashAccounts SET CurrentBalance = CurrentBalance + @delta WHERE Id = @id",
            connection, transaction);
        cmd.Parameters.AddWithValue("@delta", delta);
        cmd.Parameters.AddWithValue("@id", accountId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task ReverseBalanceAsync(SqlConnection connection, SqlTransaction transaction,
        int accountId, string type, decimal amount)
    {
        var delta = type == "IN" ? -amount : amount;
        await using var cmd = new SqlCommand(@"
            UPDATE CashAccounts SET CurrentBalance = CurrentBalance + @delta WHERE Id = @id",
            connection, transaction);
        cmd.Parameters.AddWithValue("@delta", delta);
        cmd.Parameters.AddWithValue("@id", accountId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static void AddAccountParams(SqlCommand cmd, CreateCashAccountRequestDto request)
    {
        cmd.Parameters.AddWithValue("@code", request.AccountCode.Trim().ToUpperInvariant());
        cmd.Parameters.AddWithValue("@name", request.AccountName.Trim());
        cmd.Parameters.AddWithValue("@number", (object?)request.AccountNumber?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@type", request.AccountType.Trim());
        cmd.Parameters.AddWithValue("@bank", (object?)request.BankName?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@opening", request.OpeningBalance);
        cmd.Parameters.AddWithValue("@outlet", (object?)request.OutletId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@isDefault", request.IsDefault);
        cmd.Parameters.AddWithValue("@isActive", request.IsActive);
        cmd.Parameters.AddWithValue("@notes", (object?)request.Notes?.Trim() ?? DBNull.Value);
    }

    private static void AddTransactionParams(SqlCommand cmd, CreateCashTransactionRequestDto request)
    {
        cmd.Parameters.AddWithValue("@accountId", request.CashAccountId);
        cmd.Parameters.AddWithValue("@type", request.TransactionType.Trim().ToUpperInvariant());
        cmd.Parameters.AddWithValue("@amount", request.Amount);
        cmd.Parameters.AddWithValue("@date", request.TransactionDate);
        cmd.Parameters.AddWithValue("@ref", (object?)request.ReferenceNumber?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@desc", (object?)request.Description?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@userId", (object?)request.UserId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@outletId", (object?)request.OutletId ?? DBNull.Value);
    }

    private static CashAccountListItemDto MapAccount(SqlDataReader reader) =>
        new()
        {
            Id = reader.GetInt32(0),
            AccountCode = reader.GetString(1),
            AccountName = reader.GetString(2),
            AccountNumber = reader.IsDBNull(3) ? null : reader.GetString(3),
            AccountType = reader.GetString(4),
            BankName = reader.IsDBNull(5) ? null : reader.GetString(5),
            OpeningBalance = reader.GetDecimal(6),
            CurrentBalance = reader.GetDecimal(7),
            OutletId = reader.IsDBNull(8) ? null : reader.GetInt32(8),
            OutletName = reader.IsDBNull(9) ? null : reader.GetString(9),
            IsDefault = reader.GetBoolean(10),
            IsActive = reader.GetBoolean(11),
            Notes = reader.IsDBNull(12) ? null : reader.GetString(12),
            CreatedAt = reader.GetDateTime(13)
        };

    private static CashTransactionListItemDto MapTransaction(SqlDataReader reader) =>
        new()
        {
            Id = reader.GetInt64(0),
            CashAccountId = reader.GetInt32(1),
            AccountCode = reader.GetString(2),
            AccountName = reader.GetString(3),
            TransactionType = reader.GetString(4),
            Amount = reader.GetDecimal(5),
            TransactionDate = reader.GetDateTime(6),
            ReferenceNumber = reader.IsDBNull(7) ? null : reader.GetString(7),
            Description = reader.IsDBNull(8) ? null : reader.GetString(8),
            UserId = reader.IsDBNull(9) ? null : reader.GetInt32(9),
            UserFullName = reader.IsDBNull(10) ? null : reader.GetString(10),
            OutletId = reader.IsDBNull(11) ? null : reader.GetInt32(11),
            OutletName = reader.IsDBNull(12) ? null : reader.GetString(12),
            CreatedAt = reader.GetDateTime(13)
        };
}
