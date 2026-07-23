using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers;

public sealed class AddSiblingHandler(IStudentRepository studentRepository, ISiblingRepository siblingRepository)
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

		return siblingStudent.ToResult();
	}
}