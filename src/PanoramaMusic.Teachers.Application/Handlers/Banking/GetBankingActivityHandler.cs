using PanoramaMusic.Teachers.Application.Extensions;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Domain.Exceptions;
using PanoramaMusic.Teachers.Domain.Interfaces;

namespace PanoramaMusic.Teachers.Application.Handlers.Banking;

public sealed class GetBankingActivityHandler(
	ITeacherRepository teacherRepository,
	IBankingActivityLog bankingActivityLog)
{
	public async Task<IList<BankingActivityEntryResult>> HandleAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		_ = await teacherRepository.GetByIdAsync(teacherId, cancellationToken)
			?? throw new EntityNotFoundException($"Teacher {teacherId} was not found.");

		// Deliberately not gated on the teacher currently having banking details:
		// the history outlives the record, so a deleted set still has activity
		// worth showing.
		var entries = await bankingActivityLog.GetForTeacherAsync(teacherId, cancellationToken);

		return [.. entries.Select(entry => entry.ToResult())];
	}
}