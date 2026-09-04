using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Services;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

/// <summary>
/// Unlinks a guardian from one student only. The guardian record and its
/// other sibling links survive unless this was the guardian's last link, in
/// which case the record is deleted too — a guardian never exists standalone.
/// <para>
/// That cascade destroys the shared row, so where it would run it answers to
/// the same scope check as a direct deletion. The unlink itself never does:
/// it touches one student's association and leaves the record alone.
/// </para>
/// </summary>
public sealed class UnlinkGuardianHandler(
	IStudentRepository studentRepository,
	IGuardianRepository guardianRepository,
	IStudentGuardianRepository studentGuardianRepository,
	GuardianMaintenanceScope guardianMaintenanceScope,
	StudentWriteSourceResolver studentWriteSourceResolver)
{
	public async Task HandleAsync(UnlinkGuardianCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		var guardian = await guardianRepository.GetByIdAsync(command.GuardianId, cancellationToken)
			?? throw new EntityNotFoundException($"Guardian {command.GuardianId} was not found.");

		// delete_student_guardian is a no-op when the pair is not linked, so without
		// this check an unlink of an unrelated guardian would still raise
		// GuardianUnlinked and return 200 — writing a false audit record.
		var linkedGuardians = await studentGuardianRepository.GetGuardiansByStudentIdAsync(student.StudentId, cancellationToken);
		if (!linkedGuardians.Any(g => g.GuardianId == guardian.GuardianId))
			throw new DomainException($"{guardian.FirstName} {guardian.Surname} is not linked to {student.FirstName} {student.LastName}.");

		// Asked before the link is removed, so a caller who may not delete this
		// guardian is refused the whole operation rather than left holding an
		// unlinked student and an orphaned guardian row.
		var existingLinks = await studentGuardianRepository.GetLinkCountAsync(guardian.GuardianId, cancellationToken);
		var deletesTheGuardian = existingLinks <= 1;

		if (deletesTheGuardian)
			await guardianMaintenanceScope.EnsureMaintainableAsync(guardian, cancellationToken);

		// The unlink is made against this student, and so is the deletion that
		// follows when it was the guardian's last link.
		var source = await studentWriteSourceResolver.ForStudentAsync(student.StudentId, cancellationToken);

		var link = new StudentGuardian(student.StudentId, guardian.GuardianId);
		link.MarkUnlinked(student, guardian, source);
		await studentGuardianRepository.DeleteAsync(link, cancellationToken);

		if (deletesTheGuardian)
		{
			guardian.MarkDeleted(source);
			await guardianRepository.DeleteAsync(guardian, cancellationToken);
		}
	}
}