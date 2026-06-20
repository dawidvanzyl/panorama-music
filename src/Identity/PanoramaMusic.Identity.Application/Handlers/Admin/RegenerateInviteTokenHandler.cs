using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class RegenerateInviteTokenHandler(
	IUserRepository userRepository,
	IInviteTokenRepository inviteTokenRepository,
	IAppOptions appOptions)
{
	public async Task<RegenerateInviteTokenResult> HandleAsync(RegenerateInviteTokenCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new DomainException("User not found.");

		var token = RawToken.Generate();
		var inviteToken = new InviteToken(Guid.NewGuid(), user.UserId, token.Hash, DateTime.UtcNow.AddDays(TokenConstants.InviteTokenExpiryDays));
		await inviteTokenRepository.RevokeAndIssueAsync(user.UserId, inviteToken, cancellationToken);

		return new RegenerateInviteTokenResult($"{appOptions.AppBaseUrl}/#/register?token={token.Value}");
	}
}