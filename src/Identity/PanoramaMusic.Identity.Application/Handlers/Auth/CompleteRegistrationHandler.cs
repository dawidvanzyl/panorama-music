using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class CompleteRegistrationHandler(
	IInviteTokenRepository inviteTokenRepository,
	IUserRepository userRepository,
	IPasswordHashService passwordHashService,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task HandleAsync(CompleteRegistrationCommand command, CancellationToken cancellationToken)
	{
		var tokenHash = RawToken.From(command.Request.InviteToken).Hash;
		var inviteToken = await inviteTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken)
			?? throw new UnauthorizedException("Invalid invite token.");

		if (inviteToken.IsExpired || inviteToken.IsUsed)
			throw new UnauthorizedException("Invalid invite token.");

		await inviteTokenRepository.UseAsync(inviteToken.TokenId, cancellationToken);

		var user = await userRepository.GetByIdAsync(inviteToken.UserId, cancellationToken)
			?? throw new UnauthorizedException("User not found.");

		var passwordHash = passwordHashService.Hash(command.Request.NewPassword);
		await CompleteAsync(user, passwordHash.Value, cancellationToken);
	}

	private async Task CompleteAsync(User user, string passwordHash, CancellationToken cancellationToken)
	{
		await userRepository.UpdatePasswordAsync(user.UserId, passwordHash, clearRequiresPasswordReset: false, cancellationToken);
		await userRepository.ActivateAsync(user.UserId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.RegistrationCompleted,
				user.UserId,
				user.Email.Value,
				targetId: null,
				AuditOutcomes.Success),
			cancellationToken);
	}
}