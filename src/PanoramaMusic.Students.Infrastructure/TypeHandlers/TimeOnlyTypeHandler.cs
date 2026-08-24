using Dapper;
using System.Data;

namespace PanoramaMusic.Students.Infrastructure.TypeHandlers;

/// <summary>
/// Dapper has no built-in <see cref="DbType"/> mapping for
/// <see cref="TimeOnly"/>, so a command bound with one — an extra-curricular
/// practice time's start time — throws <c>NotSupportedException</c> at the
/// SqlMapper layer before Npgsql ever sees it. This handler hands the value
/// straight to Npgsql, which binds it to a <c>time</c> column, and reads one
/// back from either shape Npgsql may hand over.
/// </summary>
internal sealed class TimeOnlyTypeHandler : SqlMapper.TypeHandler<TimeOnly>
{
	public override TimeOnly Parse(object value) => value switch
	{
		TimeOnly timeOnly => timeOnly,
		TimeSpan timeSpan => TimeOnly.FromTimeSpan(timeSpan),
		DateTime dateTime => TimeOnly.FromDateTime(dateTime),
		string text => TimeOnly.Parse(text, System.Globalization.CultureInfo.InvariantCulture),
		_ => throw new NotSupportedException($"Cannot convert {value.GetType()} to {nameof(TimeOnly)}."),
	};

	public override void SetValue(IDbDataParameter parameter, TimeOnly value)
	{
		// Npgsql infers `time without time zone` from a TimeOnly. Setting a
		// DbType here instead would push the value back through the inference
		// that cannot handle it.
		parameter.Value = value;
	}
}