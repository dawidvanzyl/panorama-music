using PanoramaMusic.Students.Application.Commands.Students;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

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

		// Applied before anything is written, so an update the aggregate refuses
		// leaves both the student and their assignments exactly as they were.
		student.Update(
			request.FirstName,
			request.LastName,
			request.DateOfBirth,
			request.Grade,
			request.Class,
			request.Phase,
			request.Language);

		await studentRepository.UpdateAsync(student, cancellationToken);

		await DiscardExtraCurricularsIfPrivateAsync(student, cancellationToken);

		return student.ToResult();
	}

	/// <summary>
	/// A grade changing to Private takes the student out of the school, so they
	/// take part in nothing — their assignments go with the update rather than
	/// being left behind as rows the interface no longer offers a way to reach.
	/// <para>
	/// Sequenced after the student's own write on the request's ambient
	/// transaction, so an update rejected for any other reason never reaches it,
	/// and a failure here takes the whole update back with it.
	/// </para>
	/// </summary>
	private async Task DiscardExtraCurricularsIfPrivateAsync(Student student, CancellationToken cancellationToken)
	{
		if (student.Grade != GradeType.Private)
			return;

		var assignments = await studentExtraCurricularRepository.GetByStudentIdAsync(student.StudentId, cancellationToken);
		if (assignments.Count == 0)
			return;

		foreach (var assignment in assignments)
		{
			assignment.MarkRemoved(student);
		}

		// One write for the whole set, not a delete per assignment.
		await studentExtraCurricularRepository.DeleteAllByStudentIdAsync(student.StudentId, assignments, cancellationToken);
	}
}