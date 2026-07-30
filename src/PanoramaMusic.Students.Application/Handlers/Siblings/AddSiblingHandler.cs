using PanoramaMusic.Students.Application.Commands.Siblings;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Siblings;

public sealed class AddSiblingHandler(
	IStudentRepository studentRepository,
	ISiblingRepository siblingRepository,
	IStudentGuardianRepository studentGuardianRepository)
{
	public async Task<StudentResult> HandleAsync(AddSiblingCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		var siblingStudent = await studentRepository.GetByIdAsync(command.SiblingId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.SiblingId} was not found.");

		var sibling = Sibling.Create(student, siblingStudent);

		var existingSiblings = await siblingRepository.GetSiblingsAsync(command.StudentId, cancellationToken);
		if (existingSiblings.Any(s => s.StudentId == siblingStudent.StudentId))
			throw new DomainException($"{siblingStudent.FirstName} {siblingStudent.LastName} is already linked as a sibling of {student.FirstName} {student.LastName}.");

		await siblingRepository.AddAsync(sibling, cancellationToken);

		await ShareGuardiansAsync(student, siblingStudent, cancellationToken);

		return siblingStudent.ToResult();
	}

	/// <summary>
	/// Linking two students as siblings shares each student's existing
	/// guardians with the other, in both directions.
	/// </summary>
	private async Task ShareGuardiansAsync(Student student, Student siblingStudent, CancellationToken cancellationToken)
	{
		var studentGuardians = await studentGuardianRepository.GetGuardiansByStudentIdAsync(student.StudentId, cancellationToken);
		var siblingGuardians = await studentGuardianRepository.GetGuardiansByStudentIdAsync(siblingStudent.StudentId, cancellationToken);
		var siblingGuardianIds = siblingGuardians.Select(g => g.GuardianId).ToHashSet();
		var studentGuardianIds = studentGuardians.Select(g => g.GuardianId).ToHashSet();

		foreach (var guardian in studentGuardians.Where(g => !siblingGuardianIds.Contains(g.GuardianId)))
		{
			var link = StudentGuardian.Create(siblingStudent, guardian);
			await studentGuardianRepository.CreateAsync(link, cancellationToken);
		}

		foreach (var guardian in siblingGuardians.Where(g => !studentGuardianIds.Contains(g.GuardianId)))
		{
			var link = StudentGuardian.Create(student, guardian);
			await studentGuardianRepository.CreateAsync(link, cancellationToken);
		}
	}
}