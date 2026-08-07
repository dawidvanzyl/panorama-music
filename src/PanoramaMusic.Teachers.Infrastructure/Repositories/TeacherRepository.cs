using Dapper;
using Npgsql;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.ValueObjects;
using PanoramaMusic.Teachers.Infrastructure.Dtos;
using PanoramaMusic.Teachers.Infrastructure.Extensions;
using PanoramaMusic.Teachers.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Teachers.Infrastructure.Repositories;

public class TeacherRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), ITeacherRepository
{
	private const string _uniqueViolationSqlState = "23505";
	private const string _linkedAccountUniqueIndex = "teachers_linked_account_id_key";

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

	public async Task<IList<LinkableAccount>> GetLinkableAccountsAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.get_linkable_accounts",
			null,
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<LinkableAccountDto>(command);

		return [.. dtos.Select(dto => dto.MapToLinkableAccount())];
	}

	public async Task<AccountLinkState?> GetAccountLinkStateAsync(Guid accountId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.get_account_link_state",
			new { p_account_id = accountId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<AccountLinkStateDto>(command);

		return dto?.MapToAccountLinkState();
	}

	public async Task LinkAccountAsync(Teacher teacher, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.update_teacher_link_account",
			new
			{
				p_teacher_id = teacher.TeacherId,
				p_account_id = teacher.LinkedAccountId,
			},
			Transaction,
			cancellationToken);

		try
		{
			await Connection.ExecuteAsync(command);
		}
		catch (PostgresException ex) when (IsLinkedAccountUniqueViolation(ex))
		{
			// Two requests can both pass the eligibility read before either writes;
			// the unique index is what actually settles it. Translating that into
			// the same refusal the read would have produced keeps the loser of the
			// race on the 400 path instead of an unexplained 500.
			throw new DomainException("That login account is already linked to a teacher.");
		}

		domainEventCollector.Collect(teacher);
	}

	private static bool IsLinkedAccountUniqueViolation(PostgresException exception) =>
		exception.SqlState == _uniqueViolationSqlState
		&& exception.ConstraintName == _linkedAccountUniqueIndex;

	public async Task UnlinkAccountAsync(Teacher teacher, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"teachers.update_teacher_unlink_account",
			new { p_teacher_id = teacher.TeacherId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(teacher);
	}

	private static TeacherInputDto ToInputDto(Teacher teacher) =>
		new(
			teacher.FirstName,
			teacher.Surname,
			teacher.IsPrivate,
			teacher.LinkedAccountId);
}