using Dapper;
using System.Data;

namespace PanoramaMusic.Infrastructure.TypeHandlers;

/// <summary>
/// Dapper has no built-in mapping from a single composite-typed CLR value to a
/// <see cref="DbType"/> (unlike an array of the same type, which Dapper resolves
/// through a different code path), so any command bound with a raw
/// <typeparamref name="T"/> parameter throws <c>NotSupportedException</c>
/// at the SqlMapper layer. This handler bypasses Dapper's DbType inference
/// entirely and hands the value straight to Npgsql, which serializes it using
/// the composite mapping the owning context registers via
/// NpgsqlDataSourceBuilder.MapComposite.
/// </summary>
public sealed class InputTypeHandler<T> : SqlMapper.TypeHandler<T> where T : class
{
	public override T Parse(object value) =>
		throw new NotSupportedException($"{typeof(T).Name} is a write-only parameter type and is never read back from a query result.");

	public override void SetValue(IDbDataParameter parameter, T? value)
	{
		parameter.Value = value;
	}
}