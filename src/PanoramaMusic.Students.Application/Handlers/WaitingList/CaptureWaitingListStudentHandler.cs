using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.WaitingList;

/// <summary>
/// The only way a student gets onto the waiting list. Creates the student and
/// their single waiting-list entry as one unit of work — both share the ambient
/// per-request transaction <see cref="Middleware.UnitOfWorkMiddleware"/> owns,
/// so a failure on either side leaves neither persisted. A student who already
/// holds an entry is refused by the table's own unique constraint, the same
/// reasoning <c>EnrollStudentHandler</c> leaves a duplicate enrollment to.
/// </summary>
public sealed class CaptureWaitingListStudentHandler(
	IStudentRepository studentRepository,
	ILessonStructureRepository lessonStructureRepository,
	IWaitingListRepository waitingListRepository)
{
	public async Task<WaitingListEntryResult> HandleAsync(CaptureWaitingListStudentCommand command, CancellationToken cancellationToken)
	{
		// The validator has already rejected an absent value, so the request's
		// nullable members are populated by the time the use case runs.
		var request = command.Request;
		var lessonStructureId = request.LessonStructureId!.Value;

		var lessonStructure = await lessonStructureRepository.GetByIdAsync(lessonStructureId, cancellationToken)
			?? throw new DomainException($"Lesson structure '{lessonStructureId}' does not exist.");

		var student = Student.Create(
			Guid.NewGuid(),
			request.FirstName,
			request.LastName,
			request.DateOfBirth,
			request.Grade,
			request.Class,
			request.Phase,
			request.Language);

		await studentRepository.CreateAsync(student, cancellationToken);

		// Assigned here, from the server clock — never taken from the request.
		var entry = WaitingListEntry.Create(
			Guid.NewGuid(),
			student,
			lessonStructure,
			request.InstrumentType!.Value,
			request.Notes,
			DateTime.UtcNow);

		await waitingListRepository.CreateAsync(entry, cancellationToken);

		var position = await DerivePositionAsync(entry, cancellationToken);
		return entry.ToResult(position);
	}

	/// <summary>
	/// The new entry's one-based position within its own occurrence type's
	/// group, ordered by date-time added — the same derivation
	/// <c>GetWaitingListHandler</c> applies to the whole list, run here against
	/// the entry this call just created.
	/// </summary>
	private async Task<int> DerivePositionAsync(WaitingListEntry entry, CancellationToken cancellationToken)
	{
		var entries = await waitingListRepository.GetAllAsync(cancellationToken);

		var position = entries
			.Where(e => e.LessonStructure.OccurrenceType == entry.LessonStructure.OccurrenceType)
			.OrderBy(e => e.AddedAt)
			.ToList()
			.FindIndex(e => e.WaitingListEntryId == entry.WaitingListEntryId);

		return position + 1;
	}
}
