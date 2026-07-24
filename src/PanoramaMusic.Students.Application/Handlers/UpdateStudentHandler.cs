using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers;

public sealed class UpdateStudentHandler(IStudentRepository studentRepository)
{
	public async Task<StudentResult> HandleAsync(UpdateStudentCommand command, CancellationToken cancellationToken)
	{
		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

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