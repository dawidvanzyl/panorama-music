using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class RegenerateInviteTokenHandler(
	IUserRepository userRepository,
	IInviteTokenRepository inviteTokenRepository)
{
	private const int _inviteTokenExpiryDays = 7;

	public async Task<RegenerateInviteTokenResult> HandleAsync(RegenerateInviteTokenCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new DomainException("User not found.");

		await inviteTokenRepository.RevokeAllForUserAsync(user.UserId, cancellationToken);

		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = TokenHasher.ComputeSha256Hash(rawToken);
		var inviteToken = new InviteToken(Guid.NewGuid(), user.UserId, tokenHash, DateTime.UtcNow.AddDays(_inviteTokenExpiryDays));
		await inviteTokenRepository.AddAsync(inviteToken, cancellationToken);

		return new RegenerateInviteTokenResult(InviteUrlBuilder.Build(rawToken));
	}
}