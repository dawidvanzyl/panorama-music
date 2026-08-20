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

public class StudentCourseRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), IStudentCourseRepository
{
	private const string _uniqueViolationSqlState = "23505";
	private const string _studentCourseUniqueConstraint = "uq_student_courses_student_course";

	public async Task<IList<StudentCourse>> GetByStudentIdAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_student_courses",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<StudentCourseDto>(command);

		return [.. dtos.Select(dto => dto.MapToStudentCourse())];
	}

	public async Task<StudentCourse?> GetByIdAsync(Guid studentId, Guid studentCourseId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_student_course_by_id",
			new { p_student_id = studentId, p_student_course_id = studentCourseId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<StudentCourseDto>(command);

		return dto?.MapToStudentCourse();
	}

	public async Task<int> CountByStudentIdAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_enrollment_count_by_student",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);

		return await Connection.ExecuteScalarAsync<int>(command);
	}

	public async Task<bool> ExistsByStudentAndCourseAsync(Guid studentId, Guid courseId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.student_course_exists",
			new { p_student_id = studentId, p_course_id = courseId },
			Transaction,
			cancellationToken);

		return await Connection.ExecuteScalarAsync<bool>(command);
	}

	public async Task<int> CountByCourseIdAsync(Guid courseId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_enrollment_count_by_course",
			new { p_course_id = courseId },
			Transaction,
			cancellationToken);

		return await Connection.ExecuteScalarAsync<int>(command);
	}

	public async Task CreateAsync(StudentCourse enrollment, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_student_course",
			new
			{
				p_student_course_id = enrollment.StudentCourseId,
				p_student_id = enrollment.StudentId,
				p_course_id = enrollment.Course.CourseId,
				p_teacher_id = enrollment.TeacherId,
				p_enrolled_date = enrollment.EnrolledDate,
			},
			Transaction,
			cancellationToken);

		try
		{
			await Connection.ExecuteAsync(command);
		}
		catch (PostgresException ex) when (IsDuplicateEnrollment(ex))
		{
			// Two requests can both pass the handler's read before either writes;
			// the unique constraint is what actually settles it. Translating that
			// into the same refusal the read would have produced keeps the loser
			// of the race on the 400 path instead of an unexplained 500.
			throw new DomainException(StudentEnrollmentMessages.AlreadyEnrolled);
		}

		domainEventCollector.Collect(enrollment);
	}

	public async Task UpdateAsync(StudentCourse enrollment, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.update_student_course",
			new
			{
				p_student_course_id = enrollment.StudentCourseId,
				p_teacher_id = enrollment.TeacherId,
			},
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(enrollment);
	}

	public async Task DeleteAsync(StudentCourse enrollment, CancellationToken cancellationToken)
	{
		// The instrument and step go with the enrollment through the cascade on
		// student_instruments, so this stays a single delete.
		var command = CreateCommandDefinition(
			"students.delete_student_course",
			new { p_student_course_id = enrollment.StudentCourseId },
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(enrollment);
	}

	public async Task CreateInstrumentAsync(Guid studentCourseId, StudentInstrument instrument, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_student_instrument",
			new
			{
				p_student_course_id = studentCourseId,
				p_instrument_type = instrument.InstrumentType?.ToString(),
				p_step_type = instrument.StepType.ToString(),
			},
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);
	}

	public async Task DeleteInstrumentAsync(Guid studentCourseId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.delete_student_instrument",
			new { p_student_course_id = studentCourseId },
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);
	}

	private static bool IsDuplicateEnrollment(PostgresException exception) =>
		exception.SqlState == _uniqueViolationSqlState
		&& exception.ConstraintName == _studentCourseUniqueConstraint;
}