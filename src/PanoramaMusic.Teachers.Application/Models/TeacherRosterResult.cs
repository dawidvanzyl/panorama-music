namespace PanoramaMusic.Teachers.Application.Models;

/// <summary>
/// Who teaches, and nothing else. The roster read is open to a Teacher so an
/// enrollment can name one, which is a narrower need than maintaining the
/// record — so it is served by its own projection rather than by
/// <see cref="TeacherResult"/>, which also carries the linked account email and
/// the banking details.
/// </summary>
public sealed record TeacherRosterResult(
	Guid TeacherId,
	string FirstName,
	string Surname,
	bool IsActive);
