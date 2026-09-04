using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Services;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

/// <summary>
/// Creates a guardian and links it to the student, and to their siblings —
/// a guardian belongs to the family, not to one child.
/// <para>
/// A caller the guardian maintenance scope applies to links only the siblings
/// who are not enrolled: adding a guardian to an enrolled student changes a
/// record that student's own screens depend on, which such a caller may not do.
/// The guardian itself is always created, whoever the siblings are.
/// </para>
/// </summary>
public sealed class AddGuardianHandler(
	IStudentRepository studentRepository,
	ISiblingRepository siblingRepository,
	IGuardianRepository guardianRepository,
	IStudentGuardianRepository studentGuardianRepository,
	IGuardianRelationshipRepository guardianRelationshipRepository,
	GuardianMaintenanceScope guardianMaintenanceScope,
	StudentWriteSourceResolver studentWriteSourceResolver)
{
	public async Task<GuardianResult> HandleAsync(AddGuardianCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		var request = command.Request;
		_ = await guardianRelationshipRepository.GetByIdAsync(request.GuardianRelationshipId, cancellationToken)
			?? throw new DomainException($"Guardian relationship {request.GuardianRelationshipId} was not found.");

		// The Guardians tab is the same screen in both modes, so the student the
		// guardian is being added to is what says which one the request came from.
		var source = await studentWriteSourceResolver.ForStudentAsync(student.StudentId, cancellationToken);

		var guardian = Guardian.Create(
			Guid.NewGuid(),
			request.GuardianRelationshipId,
			request.FirstName,
			request.Surname,
			request.Cell,
			request.Email,
			request.ReceivesCorrespondence,
			request.ResponsibleForPayment,
			request.Married,
			source);
		await guardianRepository.CreateAsync(guardian, cancellationToken);

		var siblings = await siblingRepository.GetSiblingsAsync(student.StudentId, cancellationToken);
		if (guardianMaintenanceScope.AppliesToCaller)
		{
			var enrolledSiblingIds = await siblingRepository.GetEnrolledSiblingIdsAsync(student.StudentId, cancellationToken);
			siblings = [.. siblings.Where(sibling => !enrolledSiblingIds.Contains(sibling.StudentId))];
		}

		var studentsToLink = new List<Student> { student };
		studentsToLink.AddRange(siblings);

		foreach (var target in studentsToLink)
		{
			var link = StudentGuardian.Create(target, guardian, source);
			await studentGuardianRepository.CreateAsync(link, cancellationToken);
		}

		return guardian.ToResult();
	}
}