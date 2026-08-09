using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Handlers.Banking;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Requests.Banking;
using PanoramaMusic.Teachers.Application.Services;

namespace PanoramaMusic.Teachers.Application.Handlers.Self;

/// <summary>
/// Amends the caller's own banking details — see
/// <see cref="UpdateOwnTeacherProfileHandler"/> for why this delegates.
/// </summary>
public sealed class UpdateOwnBankingDetailsHandler(
	OwnTeacherResolver ownTeacherResolver,
	UpdateBankingDetailsHandler updateBankingDetailsHandler)
{
	public async Task<BankingDetailsResult> HandleAsync(UpdateBankingDetailsRequest request, CancellationToken cancellationToken)
	{
		var teacher = await ownTeacherResolver.ResolveAsync(cancellationToken);

		return await updateBankingDetailsHandler.HandleAsync(
			new UpdateBankingDetailsCommand(teacher.TeacherId, request),
			cancellationToken);
	}
}