using PanoramaMusic.Teachers.Domain.Entities;

namespace PanoramaMusic.Teachers.Tests.Factories;

public static class TeacherFactory
{
	public static Teacher Create(
		Guid? teacherId = null,
		string firstName = "Alice",
		string surname = "Vance",
		bool isPrivate = false) =>
		Teacher.Create(
			teacherId ?? Guid.NewGuid(),
			firstName,
			surname,
			isPrivate);

	/// <summary>
	/// A teacher already taken out of active service — the only state a
	/// permanent deletion is allowed from.
	/// </summary>
	public static Teacher CreateDeactivated(
		Guid? teacherId = null,
		string firstName = "Alice",
		string surname = "Vance",
		bool isPrivate = false)
	{
		var teacher = Create(teacherId, firstName, surname, isPrivate);
		teacher.Deactivate();

		return teacher;
	}
}