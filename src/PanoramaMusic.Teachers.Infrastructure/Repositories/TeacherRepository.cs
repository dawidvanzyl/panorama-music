using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Infrastructure.Dtos;
using PanoramaMusic.Teachers.Infrastructure.Extensions;
using PanoramaMusic.Teachers.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Teachers.Infrastructure.Repositories;

public class TeacherRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), ITeacherRepository
{
	public async Task<Teacher?> GetByIdAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.get_teacher_by_id",
			new { p_teacher_id = teacherId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<TeacherDto>(command);

		return dto?.MapToTeacher();
	}

	public async Task<IList<Teacher>> GetAllAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.get_teachers",
			null,
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<TeacherDto>(command);

		return [.. dtos.Select(dto => dto.MapToTeacher())];
	}

	public async Task CreateAsync(Teacher teacher, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.create_teacher",
			new
			{
				p_teacher_id = teacher.TeacherId,
				p_teacher = ToInputDto(teacher),
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(teacher);
	}

	public async Task UpdateProfileAsync(Teacher teacher, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.update_teacher_profile",
			new
			{
				p_teacher_id = teacher.TeacherId,
				p_first_name = teacher.FirstName,
				p_surname = teacher.Surname,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(teacher);
	}

	public async Task UpdateClassificationAsync(Teacher teacher, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.update_teacher_classification",
			new
			{
				p_teacher_id = teacher.TeacherId,
				p_is_private = teacher.IsPrivate,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(teacher);
	}

	private static TeacherInputDto ToInputDto(Teacher teacher) =>
		new(
			teacher.FirstName,
			teacher.Surname,
			teacher.IsPrivate);
}