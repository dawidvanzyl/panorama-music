using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers;

public sealed class CreateStudentHandler(IStudentRepository studentRepository)
{
	public async Task<StudentResult> HandleAsync(CreateStudentCommand command, CancellationToken cancellationToken)
	{
		var request = command.Request;
		var student = Student.Create(
			Guid.NewGuid(),
			request.FirstName,
			request.LastName,
			request.DateOfBirth,
			request.Grade,
			request.Class,
			request.Phase,
			request.Language);

		await studentRepository.CreateAsync(student, cancellationToken);

		return student.ToResult();
	}
}