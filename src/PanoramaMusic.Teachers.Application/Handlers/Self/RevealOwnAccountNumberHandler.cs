using PanoramaMusic.Teachers.Application.Commands.Banking;
using PanoramaMusic.Teachers.Application.Handlers.Banking;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Services;

namespace PanoramaMusic.Teachers.Application.Handlers.Self;

/// <summary>
/// Reveals the caller's own account number. Delegating means the reveal event —
/// and so the audit entry — is raised by the same code an Admin reveal raises
/// it from, with the actor taken from the ambient request context: a teacher
/// looking at their own number is recorded exactly as an Admin looking at it
/// would be.
/// </summary>
public sealed class RevealOwnAccountNumberHandler(
	OwnTeacherResolver ownTeacherResolver,
	RevealAccountNumberHandler revealAccountNumberHandler)
{
	public async Task<RevealedAccountNumberResult> HandleAsync(CancellationToken cancellationToken)
	{
		var teacher = await ownTeacherResolver.ResolveAsync(cancellationToken);

		return await revealAccountNumberHandler.HandleAsync(
			new RevealAccountNumberCommand(teacher.TeacherId),
			cancellationToken);
	}
}