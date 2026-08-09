using PanoramaMusic.Teachers.Application.Commands.Teachers;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Services;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Teachers;

/// <summary>
/// Deactivates a teacher and deletes their banking details in the same unit of
/// work.
/// <para>
/// The pairing is the milestone's retention decision, not an incidental
/// cleanup: a teacher who is no longer active has no reason to have an account
/// number on file, and deleting it here is what bounds how long one is held
/// without a separate purge process. Splitting the two — or letting either
/// fail on its own — would leave an account number behind for a teacher the
/// record says has none.
/// </para>
/// </summary>
public sealed class DeactivateTeacherHandler(
	ITeacherRepository teacherRepository,
	IBankingDetailsRepository bankingDetailsRepository,
	TeacherResultComposer resultComposer)
{
	public async Task<TeacherResult> HandleAsync(DeactivateTeacherCommand command, CancellationToken cancellationToken)
	{
		var teacher = await teacherRepository.GetByIdAsync(command.TeacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {command.TeacherId} was not found.");

		teacher.Deactivate();

		await teacherRepository.DeactivateAsync(teacher, cancellationToken);

		// Shares the ambient request transaction with the state change above, so
		// the two commit or roll back together.
		await DeleteBankingDetailsAsync(command.TeacherId, cancellationToken);

		return await resultComposer.ComposeAsync(teacher, cancellationToken);
	}

	/// <summary>
	/// A teacher without banking details is a complete record, so having none to
	/// delete is the ordinary case rather than a failure.
	/// </summary>
	private async Task DeleteBankingDetailsAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		var bankingDetails = await bankingDetailsRepository.GetByTeacherIdAsync(teacherId, cancellationToken);

		if (bankingDetails is null)
			return;

		bankingDetails.Delete();

		await bankingDetailsRepository.DeleteAsync(bankingDetails, cancellationToken);
	}
}