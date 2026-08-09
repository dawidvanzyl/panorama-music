namespace PanoramaMusic.Persistence.Tests.Models;

/// <summary>
/// A teachers.teachers row as stored, read straight off the table — the
/// lifecycle tests need to see whether the record survived and what state it is
/// in, not what a mapping chooses to show.
/// </summary>
public sealed record TestTeacherRow(
	Guid TeacherId,
	string FirstName,
	string Surname,
	bool IsActive);