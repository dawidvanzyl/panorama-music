using PanoramaMusic.Teachers.Application.Handlers.Banking;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Services;

namespace PanoramaMusic.Teachers.Application.Handlers.Self;

/// <summary>
/// The history of the caller's own banking details — the record of who touched
/// them and when, which is worth more to the person the details belong to than
/// to anyone else. See <see cref="UpdateOwnTeacherProfileHandler"/> for why this
/// delegates.
/// </summary>
public sealed class GetOwnBankingActivityHandler(
	OwnTeacherResolver ownTeacherResolver,
	GetBankingActivityHandler getBankingActivityHandler)
{
	public async Task<IList<BankingActivityEntryResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var teacher = await ownTeacherResolver.ResolveAsync(cancellationToken);

		return await getBankingActivityHandler.HandleAsync(teacher.TeacherId, cancellationToken);
	}
}