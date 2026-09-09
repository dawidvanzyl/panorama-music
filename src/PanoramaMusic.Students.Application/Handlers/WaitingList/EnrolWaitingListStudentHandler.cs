using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Handlers.WaitingList;

/// <summary>
/// Turns a waiting student into an enrolled one: the enrollment is created and
/// the waiting-list entry is deleted together, on the request's ambient
/// transaction, so the student is never left in both states or in neither.
/// <para>
/// The course is named by the caller rather than derived from the entry. An
/// entry records a lesson structure and no course type, and several courses can
/// be delivered under one structure, so a structure does not identify a course —
/// deriving one would be the system choosing a course type on the Coordinator's
/// behalf. The occurrence type is the single thing that stays fixed, and it is
/// enforced here against the chosen course rather than trusted to the interface,
/// which only offers courses that already satisfy it.
/// </para>
/// <para>
/// Only a waiting-list student can be enrolled this way, and an enrolled student
/// is not one whatever row this table still holds for them — the same narrower
/// resolution the update and removal paths use.
/// </para>
/// </summary>
public sealed class EnrolWaitingListStudentHandler(
	IWaitingListRepository waitingListRepository,
	ICourseRepository courseRepository,
	IStudentCourseRepository studentCourseRepository,
	ITeacherDirectory teacherDirectory)
{
	public async Task<StudentCourseResult> HandleAsync(
		EnrolWaitingListStudentCommand command,
		CancellationToken cancellationToken)
	{
		// The validator has already rejected an absent value, so the request's
		// nullable members are populated by the time the use case runs — bar the
		// instrument type and step, which the chosen course's type settles inside
		// StudentCourse.Enroll.
		var request = command.Request;
		var courseId = request.CourseId!.Value;
		var teacherId = request.TeacherId!.Value;

		var entry = await waitingListRepository.GetByStudentIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} is not on the waiting list.");

		var course = await courseRepository.GetByIdAsync(courseId, cancellationToken)
			?? throw new EntityNotFoundException($"Course {courseId} was not found.");

		if (course.LessonStructure.OccurrenceType != entry.LessonStructure.OccurrenceType)
			throw new DomainException(WaitingListMessages.OccurrenceTypeIsFixed);

		var teacher = await teacherDirectory.GetTeacherAsync(teacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {teacherId} was not found.");

		var enrollment = StudentCourse.Enroll(
			Guid.NewGuid(),
			entry.Student,
			course,
			teacher,
			request.EnrolledDate!.Value,
			request.InstrumentType,
			request.StepType);

		await studentCourseRepository.CreateAsync(enrollment, cancellationToken);

		if (enrollment.Instrument is not null)
			await studentCourseRepository.CreateInstrumentAsync(enrollment.StudentCourseId, enrollment.Instrument, cancellationToken);

		// The entry goes with the enrollment, not with the student — the student
		// stays and is now enrolled, which is why this is not the same event the
		// discard path raises.
		entry.MarkEnrolled(enrollment);
		await waitingListRepository.DeleteAsync(entry, cancellationToken);

		return enrollment.ToResult(teacher);
	}
}
