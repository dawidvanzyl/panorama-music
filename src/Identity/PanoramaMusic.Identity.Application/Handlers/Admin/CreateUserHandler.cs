using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class CreateUserHandler(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IInviteTokenRepository inviteTokenRepository,
	IAppOptions appOptions,
	IUserContext userContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task<CreateUserResult> HandleAsync(CreateUserCommand command, CancellationToken cancellationToken)
	{
		var email = Email.Create(command.Request.Email);

		var existing = await userRepository.GetByEmailAsync(email.Value, cancellationToken);
		if (existing is not null)
			throw new DomainException("A user with this email already exists.");

		var user = new User(Guid.NewGuid(), email, DateTime.UtcNow);
		await CreateUserAsync(user, command.Request.Roles, cancellationToken);

		var inviteUrl = await GenerateInviteAsync(user, cancellationToken);

		return new CreateUserResult(user.UserId, inviteUrl);
	}

	private async Task CreateUserAsync(User user, IList<Role> roles, CancellationToken cancellationToken)
	{
		await userRepository.CreateAsync(user, cancellationToken);
		foreach (var role in roles)
			await userRoleRepository.CreateAsync(new UserRole(user.UserId, role), cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.UserCreated,
				userContext.GetRequiredUserId(),
				userContext.Email,
				user.UserId,
				AuditOutcomes.Success,
				detail: new Dictionary<string, object?>
				{
					["email"] = user.Email.Value,
					["roles"] = roles.Select(role => role.ToString()),
				}),
			cancellationToken);
	}

	private async Task<string> GenerateInviteAsync(User user, CancellationToken cancellationToken)
	{
		var token = RawToken.Generate();
		var inviteToken = new InviteToken(Guid.NewGuid(), user.UserId, token.Hash, DateTime.UtcNow.AddDays(TokenConstants.InviteTokenExpiryDays));
		await inviteTokenRepository.CreateAsync(inviteToken, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.InviteGenerated,
				userContext.GetRequiredUserId(),
				userContext.Email,
				user.UserId,
				AuditOutcomes.Success),
			cancellationToken);

		return $"{appOptions.AppBaseUrl}/#/register?token={token.Value}";
	}
}