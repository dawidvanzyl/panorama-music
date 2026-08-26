using PanoramaMusic.Students.Application.Commands.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;

public sealed class AssignExtraCurricularHandler(
	IStudentRepository studentRepository,
	IExtraCurricularRepository extraCurricularRepository,
	IStudentExtraCurricularRepository studentExtraCurricularRepository)
{
	public async Task<ExtraCurricularResult> HandleAsync(
		AssignExtraCurricularCommand command,
		CancellationToken cancellationToken)
	{
		// The validator has already rejected an absent value, so the request's
		// nullable member is populated by the time the use case runs.
		var extraCurricularId = command.Request.ExtraCurricularId!.Value;

		var student = await studentRepository.GetByIdAsync(command.StudentId, cancellationToken)
			?? throw new EntityNotFoundException($"Student {command.StudentId} was not found.");

		// A student or an activity the request names but that does not exist is one
		// class of failure, so both answer with the same status.
		var extraCurricular = await extraCurricularRepository.GetByIdAsync(extraCurricularId, cancellationToken)
			?? throw new EntityNotFoundException($"Extra-curricular {extraCurricularId} was not found.");

		if (await studentExtraCurricularRepository.ExistsAsync(student.StudentId, extraCurricularId, cancellationToken))
			throw new DomainException(StudentExtraCurricularMessages.AlreadyAssigned);

		// The phase rule is the assignment's own — see StudentExtraCurricular.Assign.
		var assignment = StudentExtraCurricular.Assign(student, extraCurricular);

		await studentExtraCurricularRepository.CreateAsync(assignment, cancellationToken);

		return assignment.ExtraCurricular.ToResult();
	}
}
