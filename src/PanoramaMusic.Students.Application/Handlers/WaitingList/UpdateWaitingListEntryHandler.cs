using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.WaitingList;

/// <summary>
/// Corrects a waiting-list entry's own details. The added date-time is not
/// among them: it never reaches the entity, and the repository's update has no
/// parameter for it, so a request cannot move a row up the queue however it is
/// shaped. Changing the lesson structure may move the entry to the other
/// occurrence type, where its position is re-derived from that same original
/// added date-time rather than sending it to the back. The structure it moves
/// to must be one the school offers, on the same reasoning capture applies: an
/// entry may not be parked on a combination nothing can enrol it into.
/// </summary>
public sealed class UpdateWaitingListEntryHandler(
	ILessonStructureRepository lessonStructureRepository,
	IWaitingListRepository waitingListRepository)
{
	public async Task<WaitingListEntryResult> HandleAsync(UpdateWaitingListEntryCommand command, CancellationToken cancellationToken)
	{
		var entry = await waitingListRepository.GetByIdAsync(command.WaitingListEntryId, cancellationToken)
			?? throw new EntityNotFoundException($"Waiting list entry {command.WaitingListEntryId} was not found.");

		// The validator has already rejected an absent value, so the request's
		// nullable members are populated by the time the use case runs.
		var request = command.Request;
		var lessonStructureId = request.LessonStructureId!.Value;

		var lessonStructure = await lessonStructureRepository.GetOfferedByIdAsync(lessonStructureId, cancellationToken);

		entry.Update(lessonStructure, request.InstrumentType!.Value, request.Notes);

		await waitingListRepository.UpdateAsync(entry, cancellationToken);

		var entries = await waitingListRepository.GetAllAsync(cancellationToken);
		return entry.ToResult(entry.DerivePosition(entries));
	}
}