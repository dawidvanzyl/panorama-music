using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Tests.Factories;

public static class CourseFactory
{
	public static Course Create(
		Guid? courseId = null,
		CourseType courseType = CourseType.Theory,
		decimal cost = 120.00m,
		LessonStructure? lessonStructure = null) =>
		new(courseId ?? Guid.NewGuid(), courseType, cost, lessonStructure ?? LessonStructureFactory.Create());
}
