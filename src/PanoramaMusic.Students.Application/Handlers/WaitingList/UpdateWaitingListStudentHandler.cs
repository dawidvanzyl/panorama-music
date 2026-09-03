using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.WaitingList;

/// <summary>
/// Corrects a waiting-list student's own details from the wizard's Student tab,
/// leaving their waiting-list entry untouched. A misspelled name is fixed here
/// rather than by discarding and recapturing the student, which would move them
/// to the back of the queue.
/// <para>
/// The student is reached through their waiting-list entry, so one who holds no
/// entry cannot be reached at all. This route is a Coordinator's, where the
/// roster's own update is a Teacher's; reading the student directly instead
/// would make it a way to edit any enrolled student's record from the one
/// screen a Coordinator owns.
/// </para>
/// </summary>
public sealed class UpdateWaitingListStudentHandler(
	IStudentRepository studentRepository,
	IWaitingListRepository waitingListRepository)
{
	public async Task<StudentResult> HandleAsync(UpdateWaitingListStudentCommand command, CancellationToken cancellationToken)
	{
		var entry = await waitingListRepository.GetByStudentIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} is not on the waiting list.");

		// The entry is read back with its student joined, so this is the stored
		// record itself rather than a second lookup of the same row.
		var student = entry.Student;
		var request = command.Request;

		student.Update(
			request.FirstName,
			request.LastName,
			request.DateOfBirth,
			request.Grade,
			request.Class,
			request.Phase,
			request.Language);

		await studentRepository.UpdateAsync(student, cancellationToken);

		return student.ToResult();
	}
}