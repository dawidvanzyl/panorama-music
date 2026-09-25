using Dapper;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Dtos;
using PanoramaMusic.Reporting.Infrastructure.Extensions;
using System.Data;

namespace PanoramaMusic.Reporting.Infrastructure.Readers;

/// <summary>Reads the whole population's sibling-group membership in one set-based query.</summary>
public sealed class SiblingGroupReader(IUnitOfWork unitOfWork) : ISiblingGroupReader
{
	public async Task<IReadOnlyList<SiblingGroupMembership>> ReadAsync(
		IReadOnlyCollection<Guid> studentIds, CancellationToken cancellationToken)
	{
		var command = new CommandDefinition(
			"students.get_sibling_groups",
			new { p_student_ids = studentIds.ToArray() },
			unitOfWork.Transaction,
			commandType: CommandType.StoredProcedure,
			cancellationToken: cancellationToken);
		var dtos = await unitOfWork.Connection.QueryAsync<SiblingGroupDto>(command);

		return [.. dtos.Select(dto => dto.ToSiblingGroupMembership())];
	}
}
