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
}