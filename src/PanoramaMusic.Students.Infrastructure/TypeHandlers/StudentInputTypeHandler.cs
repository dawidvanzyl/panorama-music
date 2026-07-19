using Dapper;
using PanoramaMusic.Students.Infrastructure.Dtos;
using System.Data;

namespace PanoramaMusic.Students.Infrastructure.TypeHandlers;

/// <summary>
/// Dapper has no built-in mapping from a single composite-typed CLR value to a
/// <see cref="DbType"/> (unlike an array of the same type, which Dapper resolves
/// through a different code path), so any command bound with a raw
/// <see cref="StudentInputDto"/> parameter throws <c>NotSupportedException</c>
/// at the SqlMapper layer. This handler bypasses Dapper's DbType inference
/// entirely and hands the value straight to Npgsql, which serializes it using
/// the students.student_input composite mapping registered via
/// NpgsqlDataSourceBuilder.MapComposite.
/// </summary>
internal sealed class StudentInputTypeHandler : SqlMapper.TypeHandler<StudentInputDto>
{
	public override StudentInputDto Parse(object value) =>
		throw new NotSupportedException($"{nameof(StudentInputDto)} is a write-only parameter type and is never read back from a query result.");

	public override void SetValue(IDbDataParameter parameter, StudentInputDto? value)
	{
		parameter.Value = value;
	}
}