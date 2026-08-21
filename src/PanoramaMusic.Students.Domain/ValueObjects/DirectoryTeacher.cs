namespace PanoramaMusic.Students.Domain.ValueObjects;

/// <summary>
/// A teacher as this context needs one: an identifier and the name a human
/// reads. This is the shape Students asks for through
/// <see cref="Interfaces.ITeacherDirectory"/>, not the Teachers context's own
/// record — everything else about a teacher is someone else's to answer.
/// </summary>
public sealed record DirectoryTeacher(Guid TeacherId, string FirstName, string Surname)
{
	public override string ToString() => $"{FirstName} {Surname}";
}