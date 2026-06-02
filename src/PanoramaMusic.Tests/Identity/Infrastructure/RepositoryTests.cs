using System.Collections;
using System.Data;
using System.Data.Common;
using System.Diagnostics.CodeAnalysis;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class RepositoryTests
{
    // ─── UserRepository ──────────────────────────────────────────────────────

    [Fact]
    [Trait("AC", "M1UC11")]
    public async Task UserRepository_GetByIdAsync_UsesCorrectFunctionAndParameters()
    {
        var connection = new SpyDbConnection();
        var repo = new UserRepository(connection);
        var userId = Guid.NewGuid();

        await repo.GetByIdAsync(userId);

        var cmd = connection.ExecutedCommands.ShouldHaveSingleItem();
        cmd.CommandText.ShouldBe("identity.get_user_by_id");
        cmd.CommandType.ShouldBe(CommandType.StoredProcedure);
        cmd.CapturedParameters.ShouldContainKey("p_user_id");
        cmd.CapturedParameters["p_user_id"].ShouldBe(userId);
    }

    [Fact]
    [Trait("AC", "M1UC12")]
    public async Task UserRepository_AddAsync_UsesCorrectFunctionAndParameters()
    {
        var connection = new SpyDbConnection();
        var repo = new UserRepository(connection);
        var userId = Guid.NewGuid();
        var user = new User(userId, Email.Create("test@example.com"), DateTime.UtcNow);

        await repo.AddAsync(user);

        // First command: create_user
        connection.ExecutedCommands.Count.ShouldBeGreaterThanOrEqualTo(1);
        var createCmd = connection.ExecutedCommands[0];
        createCmd.CommandText.ShouldBe("identity.create_user");
        createCmd.CommandType.ShouldBe(CommandType.StoredProcedure);
        createCmd.CapturedParameters.ShouldContainKey("p_user_id");
        createCmd.CapturedParameters["p_user_id"].ShouldBe(userId);
        createCmd.CapturedParameters.ShouldContainKey("p_email");
        createCmd.CapturedParameters["p_email"].ShouldBe("test@example.com");
    }

    [Fact]
    [Trait("AC", "M1UC13")]
    public async Task UserRepository_UpdateAsync_UsesCorrectFunctionAndParameters()
    {
        var connection = new SpyDbConnection();
        var repo = new UserRepository(connection);
        var userId = Guid.NewGuid();
        var user = new User(userId, Email.Create("test@example.com"), DateTime.UtcNow);
        var hash = PasswordHash.Create("$argon2id$someHash");
        user.SetPassword(hash);

        await repo.UpdateAsync(user);

        connection.ExecutedCommands.Count.ShouldBeGreaterThanOrEqualTo(1);
        var updateCmd = connection.ExecutedCommands[0];
        updateCmd.CommandText.ShouldBe("identity.update_user_password");
        updateCmd.CommandType.ShouldBe(CommandType.StoredProcedure);
        updateCmd.CapturedParameters.ShouldContainKey("p_user_id");
        updateCmd.CapturedParameters["p_user_id"].ShouldBe(userId);
        updateCmd.CapturedParameters.ShouldContainKey("p_password_hash");
    }

    // ─── InviteTokenRepository ───────────────────────────────────────────────

    [Fact]
    [Trait("AC", "M1UC14")]
    public async Task InviteTokenRepository_GetByHashAsync_UsesCorrectFunctionAndParameters()
    {
        var connection = new SpyDbConnection();
        var repo = new InviteTokenRepository(connection);
        const string tokenHash = "abc123hash";

        await repo.GetByTokenHashAsync(tokenHash);

        var cmd = connection.ExecutedCommands.ShouldHaveSingleItem();
        cmd.CommandText.ShouldBe("identity.get_invite_token_by_hash");
        cmd.CommandType.ShouldBe(CommandType.StoredProcedure);
        cmd.CapturedParameters.ShouldContainKey("p_token_hash");
        cmd.CapturedParameters["p_token_hash"].ShouldBe(tokenHash);
    }

    // ─── RefreshTokenRepository ──────────────────────────────────────────────

    [Fact]
    [Trait("AC", "M1UC15")]
    public async Task RefreshTokenRepository_GetByHashAsync_UsesCorrectFunctionAndParameters()
    {
        var connection = new SpyDbConnection();
        var repo = new RefreshTokenRepository(connection);
        const string tokenHash = "refreshhash456";

        await repo.GetByTokenHashAsync(tokenHash);

        var cmd = connection.ExecutedCommands.ShouldHaveSingleItem();
        cmd.CommandText.ShouldBe("identity.get_refresh_token_by_hash");
        cmd.CommandType.ShouldBe(CommandType.StoredProcedure);
        cmd.CapturedParameters.ShouldContainKey("p_token_hash");
        cmd.CapturedParameters["p_token_hash"].ShouldBe(tokenHash);
    }
}

// ─── Spy infrastructure ───────────────────────────────────────────────────────

file sealed class SpyDbConnection : DbConnection
{
    public List<SpyDbCommand> ExecutedCommands { get; } = [];

    [AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => string.Empty;
    public override string DataSource => string.Empty;
    public override string ServerVersion => string.Empty;
    public override ConnectionState State => ConnectionState.Open;

    public override void ChangeDatabase(string databaseName) { }
    public override void Close() { }
    public override void Open() { }

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel)
        => throw new NotSupportedException();

    protected override DbCommand CreateDbCommand()
    {
        var cmd = new SpyDbCommand();
        ExecutedCommands.Add(cmd);
        return cmd;
    }
}

file sealed class SpyDbCommand : DbCommand
{
    public Dictionary<string, object?> CapturedParameters { get; } = new();

    [AllowNull]
    public override string CommandText { get; set; } = string.Empty;
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; }
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get; set; }
    protected override DbParameterCollection DbParameterCollection { get; } = new SpyParameterCollection();
    protected override DbTransaction? DbTransaction { get; set; }

    public override void Cancel() { }
    public override void Prepare() { }

    protected override DbParameter CreateDbParameter() => new SpyParameter();

    public override int ExecuteNonQuery()
    {
        CaptureParameters();
        return 1;
    }

    public override Task<int> ExecuteNonQueryAsync(CancellationToken cancellationToken)
    {
        CaptureParameters();
        return Task.FromResult(1);
    }

    public override object? ExecuteScalar()
    {
        CaptureParameters();
        return null;
    }

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
    {
        CaptureParameters();
        return new EmptyDbDataReader();
    }

    protected override Task<DbDataReader> ExecuteDbDataReaderAsync(
        CommandBehavior behavior, CancellationToken cancellationToken)
    {
        CaptureParameters();
        return Task.FromResult<DbDataReader>(new EmptyDbDataReader());
    }

    private void CaptureParameters()
    {
        foreach (SpyParameter p in DbParameterCollection)
        {
            CapturedParameters[p.ParameterName] = p.Value;
        }
    }
}

file sealed class SpyParameter : DbParameter
{
    public override DbType DbType { get; set; }
    public override ParameterDirection Direction { get; set; } = ParameterDirection.Input;
    public override bool IsNullable { get; set; }
    [AllowNull]
    public override string ParameterName { get; set; } = string.Empty;
    public override int Size { get; set; }
    [AllowNull]
    public override string SourceColumn { get; set; } = string.Empty;
    public override bool SourceColumnNullMapping { get; set; }
    public override object? Value { get; set; }

    public override void ResetDbType() { }
}

file sealed class SpyParameterCollection : DbParameterCollection
{
    private readonly List<SpyParameter> _params = [];

    public override int Count => _params.Count;
    public override object SyncRoot => _params;

    public override int Add(object value)
    {
        _params.Add((SpyParameter)value);
        return _params.Count - 1;
    }

    public override void AddRange(Array values)
    {
        foreach (var v in values) Add(v);
    }

    public override void Clear() => _params.Clear();

    public override bool Contains(object value) => _params.Contains((SpyParameter)value);
    public override bool Contains(string value) => _params.Any(p => p.ParameterName == value);

    public override void CopyTo(Array array, int index) => ((ICollection)_params).CopyTo(array, index);

    public override IEnumerator GetEnumerator() => _params.GetEnumerator();

    public override int IndexOf(object value) => _params.IndexOf((SpyParameter)value);
    public override int IndexOf(string parameterName) => _params.FindIndex(p => p.ParameterName == parameterName);

    public override void Insert(int index, object value) => _params.Insert(index, (SpyParameter)value);

    public override void Remove(object value) => _params.Remove((SpyParameter)value);
    public override void RemoveAt(int index) => _params.RemoveAt(index);
    public override void RemoveAt(string parameterName) => _params.RemoveAt(IndexOf(parameterName));

    protected override DbParameter GetParameter(int index) => _params[index];
    protected override DbParameter GetParameter(string parameterName) =>
        _params.First(p => p.ParameterName == parameterName);

    protected override void SetParameter(int index, DbParameter value) => _params[index] = (SpyParameter)value;
    protected override void SetParameter(string parameterName, DbParameter value) =>
        _params[IndexOf(parameterName)] = (SpyParameter)value;
}

file sealed class EmptyDbDataReader : DbDataReader
{
    public override bool HasRows => false;
    public override bool IsClosed => false;
    public override int RecordsAffected => 0;
    public override int FieldCount => 0;
    public override int Depth => 0;
    public override object this[int ordinal] => throw new IndexOutOfRangeException();
    public override object this[string name] => throw new KeyNotFoundException();

    public override bool Read() => false;
    public override Task<bool> ReadAsync(CancellationToken cancellationToken) => Task.FromResult(false);
    public override bool NextResult() => false;

    public override bool GetBoolean(int ordinal) => throw new NotImplementedException();
    public override byte GetByte(int ordinal) => throw new NotImplementedException();
    public override long GetBytes(int ordinal, long dataOffset, byte[]? buffer, int bufferOffset, int length) => throw new NotImplementedException();
    public override char GetChar(int ordinal) => throw new NotImplementedException();
    public override long GetChars(int ordinal, long dataOffset, char[]? buffer, int bufferOffset, int length) => throw new NotImplementedException();
    public override string GetDataTypeName(int ordinal) => throw new NotImplementedException();
    public override DateTime GetDateTime(int ordinal) => throw new NotImplementedException();
    public override decimal GetDecimal(int ordinal) => throw new NotImplementedException();
    public override double GetDouble(int ordinal) => throw new NotImplementedException();
    public override Type GetFieldType(int ordinal) => throw new NotImplementedException();
    public override float GetFloat(int ordinal) => throw new NotImplementedException();
    public override Guid GetGuid(int ordinal) => throw new NotImplementedException();
    public override short GetInt16(int ordinal) => throw new NotImplementedException();
    public override int GetInt32(int ordinal) => throw new NotImplementedException();
    public override long GetInt64(int ordinal) => throw new NotImplementedException();
    public override string GetName(int ordinal) => throw new NotImplementedException();
    public override int GetOrdinal(string name) => throw new NotImplementedException();
    public override string GetString(int ordinal) => throw new NotImplementedException();
    public override object GetValue(int ordinal) => throw new NotImplementedException();
    public override int GetValues(object[] values) => throw new NotImplementedException();
    public override bool IsDBNull(int ordinal) => throw new NotImplementedException();
    public override IEnumerator GetEnumerator() => throw new NotImplementedException();
}
