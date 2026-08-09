using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Handlers.Banking;
using PanoramaMusic.Teachers.Application.Services;

namespace PanoramaMusic.Teachers.Application.Handlers.Self;

/// <summary>
/// Deletes the caller's own banking details — see
/// <see cref="UpdateOwnTeacherProfileHandler"/> for why this delegates.
/// </summary>
public sealed class DeleteOwnBankingDetailsHandler(
	OwnTeacherResolver ownTeacherResolver,
	DeleteBankingDetailsHandler deleteBankingDetailsHandler)
{
	public async Task HandleAsync(CancellationToken cancellationToken)
	{
		var teacher = await ownTeacherResolver.ResolveAsync(cancellationToken);

		await deleteBankingDetailsHandler.HandleAsync(
			new DeleteBankingDetailsCommand(teacher.TeacherId),
			cancellationToken);
	}
}