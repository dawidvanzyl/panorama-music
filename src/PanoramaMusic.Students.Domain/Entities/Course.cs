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

	public decimal Cost { get; private set; }

	public LessonStructure LessonStructure { get; }

	public static Course Create(Guid courseId, CourseType courseType, decimal cost, LessonStructure lessonStructure)
	{
		var course = new Course(courseId, courseType, cost, lessonStructure);

		course.Raise(new CourseCreated(course));
		return course;
	}

	/// <summary>
	/// The cost is the whole of a course's mutable state — its type and the
	/// structure it is delivered under are settled at creation and stay put.
	/// </summary>
	public void UpdateCost(decimal cost)
	{
		var before = new Course(CourseId, CourseType, Cost, LessonStructure);

		Cost = cost;

		Raise(new CourseCostUpdated(before, this));
	}

	public void MarkDeleted()
	{
		Raise(new CourseDeleted(this));
	}
}