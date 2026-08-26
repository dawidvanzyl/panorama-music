using Dapper;
using Npgsql;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class StudentExtraCurricularRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), IStudentExtraCurricularRepository
{
	private const string _uniqueViolationSqlState = "23505";
	private const string _studentExtraCurricularPrimaryKey = "pk_student_extra_curriculars";

	public async Task<IList<StudentExtraCurricular>> GetByStudentIdAsync(Guid studentId, CancellationToken cancellationToken)
	{
		// The function joins the activities and their practice times itself, so the
		// whole list arrives resolved in this one round trip.
		var command = CreateCommandDefinition(
			"students.get_student_extra_curriculars",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<ExtraCurricularPracticeTimeDto>(command);

		return [.. dtos.MapToExtraCurriculars().Select(extraCurricular => new StudentExtraCurricular(studentId, extraCurricular))];
	}

	public async Task<IList<ExtraCurricular>> GetAssignableAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_assignable_extra_curriculars",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<ExtraCurricularPracticeTimeDto>(command);

		return dtos.MapToExtraCurriculars();
	}

	public async Task<bool> ExistsAsync(Guid studentId, Guid extraCurricularId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.student_extra_curricular_exists",
			new { p_student_id = studentId, p_extra_curricular_id = extraCurricularId },
			Transaction,
			cancellationToken);

		return await Connection.ExecuteScalarAsync<bool>(command);
	}

	public async Task CreateAsync(StudentExtraCurricular assignment, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_student_extra_curricular",
			new
			{
				p_student_id = assignment.StudentId,
				p_extra_curricular_id = assignment.ExtraCurricular.ExtraCurricularId,
			},
			Transaction,
			cancellationToken);

		try
		{
			await Connection.ExecuteAsync(command);
		}
		catch (PostgresException ex) when (IsDuplicateAssignment(ex))
		{
			// Two requests can both pass the handler's membership test before either
			// writes; the primary key is what actually settles it. Translating that
			// into the same refusal the test would have produced keeps the loser of
			// the race on the 400 path instead of an unexplained 500.
			throw new DomainException(StudentExtraCurricularMessages.AlreadyAssigned);
		}

		domainEventCollector.Collect(assignment);
	}

	public async Task DeleteAsync(StudentExtraCurricular assignment, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.delete_student_extra_curricular",
			new
			{
				p_student_id = assignment.StudentId,
				p_extra_curricular_id = assignment.ExtraCurricular.ExtraCurricularId,
			},
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(assignment);
	}

	private static bool IsDuplicateAssignment(PostgresException exception) =>
		exception.SqlState == _uniqueViolationSqlState
		&& exception.ConstraintName == _studentExtraCurricularPrimaryKey;
}
