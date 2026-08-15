using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Courses;

namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// A course the school offers. It holds the lesson structure it is delivered
/// under rather than just that structure's identifier, so a course can only be
/// built from a structure that was actually read back from the seeded lookup.
/// </summary>
public sealed class Course : AggregateRoot
{
	public Course(Guid courseId, CourseType courseType, decimal cost, LessonStructure lessonStructure)
	{
		CourseId = courseId;
		CourseType = courseType;
		Cost = cost;
		LessonStructure = lessonStructure;
	}

	public Guid CourseId { get; }

	public CourseType CourseType { get; }

	public decimal Cost { get; }

	public LessonStructure LessonStructure { get; }

	public static Course Create(Guid courseId, CourseType courseType, decimal cost, LessonStructure lessonStructure)
	{
		var course = new Course(courseId, courseType, cost, lessonStructure);

		course.Raise(new CourseCreated(course));
		return course;
	}
}