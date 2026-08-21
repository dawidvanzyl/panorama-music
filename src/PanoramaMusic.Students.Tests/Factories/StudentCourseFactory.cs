using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Tests.Factories;

public static class StudentCourseFactory
{
	/// <summary>
	/// Builds an already-persisted enrollment through the plain constructor —
	/// the read path's shape, with no domain event raised.
	/// </summary>
	public static StudentCourse Create(
		Guid? studentCourseId = null,
		Guid? studentId = null,
		Course? course = null,
		Guid? teacherId = null,
		DateOnly? enrolledDate = null,
		StudentInstrument? instrument = null) =>
		new(
			studentCourseId ?? Guid.NewGuid(),
			studentId ?? Guid.NewGuid(),
			course ?? CourseFactory.Create(),
			teacherId ?? Guid.NewGuid(),
			enrolledDate ?? new DateOnly(2026, 8, 16),
			instrument);
}