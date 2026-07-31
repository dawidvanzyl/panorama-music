using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

public sealed class AddGuardianHandler(
	IStudentRepository studentRepository,
	ISiblingRepository siblingRepository,
	IGuardianRepository guardianRepository,
	IStudentGuardianRepository studentGuardianRepository,
	IGuardianRelationshipRepository guardianRelationshipRepository)
{
	public async Task<GuardianResult> HandleAsync(AddGuardianCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		var request = command.Request;
		_ = await guardianRelationshipRepository.GetByIdAsync(request.GuardianRelationshipId, cancellationToken)
			?? throw new DomainException($"Guardian relationship {request.GuardianRelationshipId} was not found.");

		var guardian = Guardian.Create(
			Guid.NewGuid(),
			request.GuardianRelationshipId,
			request.FirstName,
			request.Surname,
			request.Cell,
			request.Email,
			request.ReceivesCorrespondence,
			request.ResponsibleForPayment,
			request.Married);
		await guardianRepository.CreateAsync(guardian, cancellationToken);

		var siblings = await siblingRepository.GetSiblingsAsync(student.StudentId, cancellationToken);
		var studentsToLink = new List<Student> { student };
		studentsToLink.AddRange(siblings);

		foreach (var target in studentsToLink)
		{
			var link = StudentGuardian.Create(target, guardian);
			await studentGuardianRepository.CreateAsync(link, cancellationToken);
		}

		return guardian.ToResult();
	}
}