using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Handlers.Banking;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Requests.Banking;
using PanoramaMusic.Teachers.Application.Services;

namespace PanoramaMusic.Teachers.Application.Handlers.Self;

/// <summary>
/// Captures the caller's own banking details through the same handler an Admin
/// capture goes through — see <see cref="UpdateOwnTeacherProfileHandler"/> for
/// why the self-service handlers delegate rather than reimplement.
/// </summary>
public sealed class CreateOwnBankingDetailsHandler(
	OwnTeacherResolver ownTeacherResolver,
	CreateBankingDetailsHandler createBankingDetailsHandler)
{
	public async Task<BankingDetailsResult> HandleAsync(CreateBankingDetailsRequest request, CancellationToken cancellationToken)
	{
		var teacher = await ownTeacherResolver.ResolveAsync(cancellationToken);

		return await createBankingDetailsHandler.HandleAsync(
			new CreateBankingDetailsCommand(teacher.TeacherId, request),
			cancellationToken);
	}
}