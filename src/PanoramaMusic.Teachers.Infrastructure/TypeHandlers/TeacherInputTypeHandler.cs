using Dapper;
using PanoramaMusic.Teachers.Infrastructure.Dtos;
using System.Data;

namespace PanoramaMusic.Teachers.Infrastructure.TypeHandlers;

/// <summary>
/// Dapper has no built-in mapping from a single composite-typed CLR value to a
/// <see cref="DbType"/> (unlike an array of the same type, which Dapper resolves
/// through a different code path), so any command bound with a raw
/// <see cref="TeacherInputDto"/> parameter throws <c>NotSupportedException</c>
/// at the SqlMapper layer. This handler bypasses Dapper's DbType inference
/// entirely and hands the value straight to Npgsql, which serializes it using
/// the teachers.teacher_input composite mapping registered via
/// NpgsqlDataSourceBuilder.MapComposite.
/// </summary>
internal sealed class TeacherInputTypeHandler : SqlMapper.TypeHandler<TeacherInputDto>
{
	public override TeacherInputDto Parse(object value) =>
		throw new NotSupportedException($"{nameof(TeacherInputDto)} is a write-only parameter type and is never read back from a query result.");

	public override void SetValue(IDbDataParameter parameter, TeacherInputDto? value)
	{
		parameter.Value = value;
	}
}