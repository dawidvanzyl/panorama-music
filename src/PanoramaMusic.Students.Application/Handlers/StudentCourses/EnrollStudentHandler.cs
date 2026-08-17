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

		var course = await courseRepository.GetByIdAsync(courseId, cancellationToken)
			?? throw new DomainException($"Course {courseId} was not found.");

		var teacher = await teacherDirectory.GetTeacherAsync(teacherId, cancellationToken)
			?? throw new DomainException($"Teacher {teacherId} was not found.");

		var existing = await studentCourseRepository.GetByStudentIdAsync(student.StudentId, cancellationToken);
		if (existing.Any(enrollment => enrollment.Course.CourseId == courseId))
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