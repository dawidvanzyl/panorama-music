using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Tests.Factories;

public static class DirectoryTeacherFactory
{
	public static DirectoryTeacher Create(
		Guid? teacherId = null,
		string firstName = "Thabo",
		string surname = "Nkosi") =>
		new(teacherId ?? Guid.NewGuid(), firstName, surname);
}