using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.WaitingList;

/// <summary>
/// Discards a student who was never enrolled: their waiting-list entry and
/// their student record go together, as one unit of work on the ambient
/// per-request transaction, so a failure on either side leaves both in place.
/// This is a discard rather than a withdrawal — nothing of theirs is kept.
/// <para>
/// Only a waiting-list student can be removed this way — and an enrolled student
/// is not one, whatever row this table still holds for them. Without that the
/// route would be a way to delete any enrolled student's record from the
/// waiting list, which is not what a removal from a queue means.
/// </para>
/// </summary>
public sealed class RemoveWaitingListStudentHandler(
	IStudentRepository studentRepository,
	IWaitingListRepository waitingListRepository)
{
	public async Task HandleAsync(RemoveWaitingListStudentCommand command, CancellationToken cancellationToken)
	{
		var entry = await waitingListRepository.GetByStudentIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} is not on the waiting list.");

		var student = entry.Student;

		entry.MarkRemoved();
		student.MarkDeleted();

		// The entry is deleted explicitly rather than left to the table's
		// ON DELETE CASCADE, so the removal reads as the pair it is and both
		// halves emit their own audit record.
		await waitingListRepository.DeleteAsync(entry, cancellationToken);
		await studentRepository.DeleteAsync(student, cancellationToken);
	}
}