using PanoramaMusic.Students.Application.Commands.StudentCourses;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.StudentCourses;

/// <summary>
/// Corrects an existing enrollment's assigned teacher and the instrument type
/// and step its course type records. The course and the enrolled date are
/// settled at enrollment, so neither is reachable from here.
/// </summary>
public sealed class UpdateEnrollmentHandler(
	IStudentRepository studentRepository,
	IStudentCourseRepository studentCourseRepository,
	ITeacherDirectory teacherDirectory)
{
	public async Task<StudentCourseResult> HandleAsync(UpdateEnrollmentCommand command, CancellationToken cancellationToken)
	{
		// The validator has already rejected an absent teacher; the instrument
		// type and step are genuinely optional here and settled by the course
		// type inside StudentCourse.Update.
		var teacherId = command.Request.TeacherId!.Value;

		var enrollment = await studentCourseRepository.GetByIdAsync(command.StudentId, command.StudentCourseId, cancellationToken)
			?? throw new EntityNotFoundException($"Enrollment {command.StudentCourseId} was not found.");

		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		// A teacher the request names but that does not exist answers with the
		// same status as an enrollment that does not exist, as it does on enroll.
		var teacher = await teacherDirectory.GetTeacherAsync(teacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {teacherId} was not found.");

		enrollment.Update(student, teacher, command.Request.InstrumentType, command.Request.StepType);

		await studentCourseRepository.UpdateAsync(enrollment, cancellationToken);

		return enrollment.ToResult(teacher);
	}
}