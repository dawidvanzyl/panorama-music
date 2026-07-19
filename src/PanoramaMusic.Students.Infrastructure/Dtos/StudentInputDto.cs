namespace PanoramaMusic.Students.Infrastructure.Dtos;

/// <summary>
/// Mirrors the students.student_input composite type, mapped via
/// NpgsqlDataSourceBuilder.MapComposite in ServiceCollectionExtensions.ConfigureCompositeTypes.
/// Npgsql's default composite name translator maps PascalCase properties to the
/// composite's snake_case attributes (FirstName -> first_name).
/// </summary>
internal sealed record StudentInputDto(
	string FirstName,
	string LastName,
	DateOnly DateOfBirth,
	string Grade,
	string Class,
	string Phase,
	string Language);