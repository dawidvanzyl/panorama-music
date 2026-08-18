using PanoramaMusic.Students.Application.Commands.StudentCourses;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Handlers.StudentCourses;

public sealed class EnrollStudentHandler(
	IStudentRepository studentRepository,
	ICourseRepository courseRepository,
	IStudentCourseRepository studentCourseRepository,
	ITeacherDirectory teacherDirectory)
{
	public async Task<StudentCourseResult> HandleAsync(EnrollStudentCommand command, CancellationToken cancellationToken)
	{
		// The validator has already rejected an absent value, so the request's
		// nullable members are populated by the time the use case runs — bar the
		// instrument type and step, which are genuinely optional here and settled
		// by the course type inside StudentCourse.Enroll.
		var request = command.Request;
		var courseId = request.CourseId!.Value;
		var teacherId = request.TeacherId!.Value;

		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		// A student, course or teacher the request names but that does not exist is
		// one class of failure, so all three answer with the same status rather
		// than the enrollment's own 404 and the other two's 400.
		var course = await courseRepository.GetByIdAsync(courseId, cancellationToken)
			?? throw new EntityNotFoundException($"Course {courseId} was not found.");

		var teacher = await teacherDirectory.GetTeacherAsync(teacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {teacherId} was not found.");

		// A membership test rather than a read of every enrollment the student
		// holds. The unique constraint is still what settles a race between two
		// requests; this only buys the earlier, better-explained refusal.
		if (await studentCourseRepository.ExistsByStudentAndCourseAsync(student.StudentId, courseId, cancellationToken))
			throw new DomainException(StudentEnrollmentMessages.AlreadyEnrolled);

		var enrollment = StudentCourse.Enroll(
			Guid.NewGuid(),
			student,
			course,
			teacher,
			request.EnrolledDate!.Value,
			request.InstrumentType,
			request.StepType);

		await studentCourseRepository.CreateAsync(enrollment, cancellationToken);

		return enrollment.ToResult(teacher);
	}
}