using PanoramaMusic.Domain.Exceptions;
using PanoramaMusic.Students.Application.Commands.Students;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Application.Handlers.Students;

public sealed class UpdateStudentHandler(
	IStudentRepository studentRepository,
	IStudentExtraCurricularRepository studentExtraCurricularRepository)
{
	public async Task<StudentResult> HandleAsync(UpdateStudentCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		var request = command.Request;

		if (request.Phase is { } phase)
		{
			var assignments = await studentExtraCurricularRepository.GetByStudentIdAsync(student.StudentId, cancellationToken);
			new HeldExtraCurriculars([.. assignments]).EnsureAgreesWith(phase);
		}

		student.Update(
			request.FirstName,
			request.LastName,
			request.DateOfBirth,
			request.Grade,
			request.Class,
			request.Phase,
			request.Language,
			StudentPopulation.Enrolled);

		await studentRepository.UpdateAsync(student, cancellationToken);

		return student.ToResult();
	}
}