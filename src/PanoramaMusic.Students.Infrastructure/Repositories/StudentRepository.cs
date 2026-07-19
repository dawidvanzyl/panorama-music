using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class StudentRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), IStudentRepository
{
	public async Task<Student?> GetByIdAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_student_by_id",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<StudentDto>(command);

		return dto?.MapToStudent();
	}

	public async Task<IList<Student>> GetAllAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_students",
			null,
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<StudentDto>(command);

		return [.. dtos.Select(dto => dto.MapToStudent())];
	}

	public async Task CreateAsync(Student student, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_student",
			new
			{
				p_student_id = student.StudentId,
				p_student = ToInputDto(student),
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(student);
	}

	public async Task UpdateAsync(Student student, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.update_student",
			new
			{
				p_student_id = student.StudentId,
				p_student = ToInputDto(student),
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(student);
	}

	public async Task DeleteAsync(Student student, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.delete_student",
			new { p_student_id = student.StudentId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(student);
	}

	private static StudentInputDto ToInputDto(Student student) =>
		new(
			student.FirstName,
			student.LastName,
			student.DateOfBirth,
			student.Grade.ToString(),
			student.Class.ToString(),
			student.Phase.ToString(),
			student.Language.ToString());
}