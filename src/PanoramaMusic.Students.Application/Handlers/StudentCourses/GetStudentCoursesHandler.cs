using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Application.Handlers.StudentCourses;

public sealed class GetStudentCoursesHandler(
	IStudentCourseRepository studentCourseRepository,
	ITeacherDirectory teacherDirectory)
{
	private const string _unknownTeacherFirstName = "Unknown";
	private const string _unknownTeacherSurname = "teacher";

	public async Task<IList<StudentCourseResult>> HandleAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var enrollments = await studentCourseRepository.GetByStudentIdAsync(studentId, cancellationToken);
		if (enrollments.Count == 0)
			return [];

		// One directory call for every teacher on the list, rather than a lookup
		// per enrollment.
		var teacherIds = enrollments.Select(enrollment => enrollment.TeacherId).Distinct().ToList();
		var teachers = await teacherDirectory.GetTeachersAsync(teacherIds, cancellationToken);

		return
		[
			.. enrollments.Select(enrollment => enrollment.ToResult(ResolveTeacher(teachers, enrollment.TeacherId)))
		];
	}

	/// <summary>
	/// A teacher the directory no longer answers for still leaves the enrollment
	/// readable — the row names the assignment it holds rather than disappearing
	/// from the list. It is named rather than left blank: an empty name renders as
	/// the same em dash the Instrument and Step columns use for "the course type
	/// records nothing", which is a different thing entirely.
	/// </summary>
	private static DirectoryTeacher ResolveTeacher(
		IReadOnlyDictionary<Guid, DirectoryTeacher> teachers,
		Guid teacherId) =>
		teachers.TryGetValue(teacherId, out var teacher)
			? teacher
			: new DirectoryTeacher(teacherId, _unknownTeacherFirstName, _unknownTeacherSurname);
}