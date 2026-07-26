using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

/// <summary>
/// Unlinks a guardian from one student only. The guardian record and its
/// other sibling links survive unless this was the guardian's last link, in
/// which case the record is deleted too — a guardian never exists standalone.
/// </summary>
public sealed class UnlinkGuardianHandler(
	IStudentRepository studentRepository,
	IGuardianRepository guardianRepository,
	IStudentGuardianRepository studentGuardianRepository)
{
	public async Task HandleAsync(UnlinkGuardianCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		var guardian = await guardianRepository.GetByIdAsync(command.GuardianId, cancellationToken)
			?? throw new EntityNotFoundException($"Guardian {command.GuardianId} was not found.");

		var link = new StudentGuardian(student.StudentId, guardian.GuardianId);
		link.MarkUnlinked(student, guardian);
		await studentGuardianRepository.DeleteAsync(link, cancellationToken);

		var remainingLinks = await studentGuardianRepository.GetLinkCountAsync(guardian.GuardianId, cancellationToken);
		if (remainingLinks == 0)
		{
			guardian.MarkDeleted();
			await guardianRepository.DeleteAsync(guardian, cancellationToken);
		}
	}
}