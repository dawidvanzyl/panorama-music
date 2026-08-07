namespace PanoramaMusic.Teachers.Infrastructure.Dtos;

/// <summary>
/// Mirrors the teachers.teacher_input composite type, mapped via
/// NpgsqlDataSourceBuilder.MapComposite in ServiceCollectionExtensions.ConfigureCompositeTypes.
/// Npgsql's default composite name translator maps PascalCase properties to the
/// composite's snake_case attributes (FirstName -> first_name). Used by
/// create_teacher only — the two update functions take scalar parameters.
/// </summary>
internal sealed record TeacherInputDto(
	string FirstName,
	string Surname,
	bool IsPrivate,
	Guid? LinkedAccountId);