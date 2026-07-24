using Dapper;
using System.Data;

namespace PanoramaMusic.Persistence.TypeHandlers;

/// <summary>
/// Dapper has no built-in mapping from <see cref="DateOnly"/> to a <see cref="DbType"/>,
/// so any command bound with a raw <see cref="DateOnly"/> parameter throws
/// <c>NotSupportedException</c> at the SqlMapper layer before reaching Npgsql. This
/// handler bridges the two: it writes as <see cref="DbType.Date"/> so Npgsql maps
/// the value to a PostgreSQL <c>date</c> column. On read, Npgsql already materializes
/// a <c>date</c> column as <see cref="DateOnly"/> directly, so parsing only needs to
/// convert the rarer case where the driver hands back a <see cref="DateTime"/>.
/// </summary>
public sealed class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
{
	public override DateOnly Parse(object value) => value switch
	{
		DateOnly dateOnly => dateOnly,
		DateTime dateTime => DateOnly.FromDateTime(dateTime),
		_ => throw new InvalidCastException($"Unable to convert value of type '{value.GetType()}' to {nameof(DateOnly)}."),
	};

	public override void SetValue(IDbDataParameter parameter, DateOnly value)
	{
		parameter.DbType = DbType.Date;
		parameter.Value = value.ToDateTime(TimeOnly.MinValue);
	}
}