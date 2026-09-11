using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Handlers.WaitingList;

/// <summary>
/// Turns a waiting student into an enrolled one: the enrollment is created and
/// the waiting-list entry is deleted together, on the request's ambient
/// transaction, so the student is never left in both states or in neither.
/// <para>
/// The course is resolved rather than named. An entry records an intended
/// instrument, and only an instrument course records one, so a waiting-list
/// entry is a wait for an instrument course — the lesson structure the
/// Coordinator settles on identifies it outright. Where the school offers no
/// instrument course under that structure the enrolment is refused and said so,
/// rather than left with nothing to submit.
/// </para>
/// <para>
/// The occurrence type is the single thing that stays fixed, and it is enforced
/// here against the named structure before anything is written.
/// </para>
/// <para>
/// Only a waiting-list student can be enrolled this way, and an enrolled student
/// is not one whatever row this table still holds for them — the same narrower
/// resolution the update and removal paths use.
/// </para>
/// <para>
/// Enrolling also settles the family's guardians. A guardian added while the
/// student was waiting was kept from their enrolled siblings, and enrolling is
/// the moment that reason expires — so the missing links are created here, on the
/// same unit of work, and a refused enrolment leaves every sibling exactly as
/// they were.
/// </para>
/// </summary>
public sealed class EnrolWaitingListStudentHandler(
	IWaitingListRepository waitingListRepository,
	ILessonStructureRepository lessonStructureRepository,
	ICourseRepository courseRepository,
	IStudentCourseRepository studentCourseRepository,
	ITeacherDirectory teacherDirectory,
	ISiblingRepository siblingRepository,
	IStudentGuardianRepository studentGuardianRepository)
{
	public async Task<StudentCourseResult> HandleAsync(
		EnrolWaitingListStudentCommand command,
		CancellationToken cancellationToken)
	{
		// The validator has already rejected an absent value, so the request's
		// nullable members are populated by the time the use case runs.
		var request = command.Request;
		var lessonStructureId = request.LessonStructureId!.Value;
		var teacherId = request.TeacherId!.Value;

		var entry = await waitingListRepository.GetByStudentIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} is not on the waiting list.");

		var lessonStructure = await lessonStructureRepository.GetByIdAsync(lessonStructureId, cancellationToken)
			?? throw new EntityNotFoundException($"Lesson structure {lessonStructureId} was not found.");

		if (lessonStructure.OccurrenceType != entry.LessonStructure.OccurrenceType)
			throw new DomainException(WaitingListMessages.OccurrenceTypeIsFixed);

		var course = await courseRepository.GetByTypeAndStructureAsync(
				CourseType.Instrument, lessonStructureId, cancellationToken)
			?? throw new DomainException(WaitingListMessages.NoInstrumentCourseForStructure);

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

		// Last, so that every refusal above has already had its say: a student who
		// does not end up enrolled must leave their siblings untouched. The links
		// created here are the Coordinator's enrolment, not a guardian they linked
		// by hand, and the audit trail says so.
		await ReconcileEnrolledSiblingsAsync(
			entry.Student, StudentWriteSource.WaitingList, cancellationToken);

		return enrollment.ToResult(teacher);
	}

	/// <summary>
	/// Gives this student's enrolled siblings every guardian the student holds. A
	/// guardian belongs to the family rather than to one child, so enrolling closes
	/// the gap the wait left behind. Only links are created — no guardian's own
	/// details are touched, and nothing is written where the family already agrees.
	/// <para>
	/// Only enrolled siblings are considered. A sibling still on the waiting list
	/// received the guardian when it was added, so there is nothing to repair for
	/// them.
	/// </para>
	/// </summary>
	private async Task ReconcileEnrolledSiblingsAsync(
		Student student,
		StudentWriteSource source,
		CancellationToken cancellationToken)
	{
		var missingLinks = await studentGuardianRepository.GetMissingEnrolledSiblingLinksAsync(
			student.StudentId, cancellationToken);
		if (missingLinks.Count == 0)
			return;

		// A link carries the student and the guardian rather than their ids, so
		// both are loaded once for the whole set. Each missing link names a sibling
		// of this student and a guardian this student holds, which is exactly what
		// these two reads return.
		var siblings = (await siblingRepository.GetSiblingsAsync(student.StudentId, cancellationToken))
			.ToDictionary(sibling => sibling.StudentId);
		var guardians = (await studentGuardianRepository.GetGuardiansByStudentIdAsync(student.StudentId, cancellationToken))
			.ToDictionary(guardian => guardian.GuardianId);

		foreach (var missingLink in missingLinks)
		{
			var link = StudentGuardian.Create(
				siblings[missingLink.StudentId],
				guardians[missingLink.GuardianId],
				source);
			await studentGuardianRepository.CreateAsync(link, cancellationToken);
		}
	}
}