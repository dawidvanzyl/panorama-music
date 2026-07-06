using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class RefreshTokenHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IJwtService jwtService,
	ISessionOptions sessionOptions,
	IClientContext clientContext,
	IUnitOfWork unitOfWork,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	private const int _refreshTokenExpiryDays = 7;

	public async Task<AuthResult> HandleAsync(RefreshTokenCommand command, CancellationToken cancellationToken)
	{
		var tokenHash = RawToken.From(command.Request.Token).Hash;
		var existing = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken)
			?? throw new UnauthorizedException("Invalid refresh token.");

		if (existing.IsRevoked)
		{
			// A previously rotated (and therefore revoked) token being presented again is a replay —
			// revoke the whole family so the leaked chain can't be used for further rotations.
			// Isolated: this security write must persist even though the request
			// fails and the middleware rolls back the ambient transaction.
			await unitOfWork.ExecuteIsolatedAsync(
				() => RevokeFamilyAsync(existing.FamilyId, existing.UserId, cancellationToken),
				cancellationToken);
			throw new UnauthorizedException("Refresh token has been revoked.");
		}

		if (existing.IsExpired)
			throw new UnauthorizedException("Refresh token has expired.");

		var absoluteSessionLifetime = TimeSpan.FromDays(sessionOptions.AbsoluteSessionLifetimeDays);
		if (existing.IsSessionExpired(absoluteSessionLifetime))
		{
			// Isolated: the revocation must persist even though the request
			// fails and the middleware rolls back the ambient transaction.
			await unitOfWork.ExecuteIsolatedAsync(
				() => RevokeExpiredSessionAsync(existing.TokenId, existing.UserId, cancellationToken),
				cancellationToken);
			throw new UnauthorizedException("Session has expired. Please log in again.");
		}

		var user = await userRepository.GetByIdAsync(existing.UserId, cancellationToken)
			?? throw new UnauthorizedException("User not found.");

		return !user.IsActive
			? throw new UnauthorizedException("User account is not active.")
			: await RotateAsync(existing, user, cancellationToken);
	}

	private async Task RevokeFamilyAsync(Guid familyId, Guid userId, CancellationToken cancellationToken)
	{
		await refreshTokenRepository.RevokeFamilyAsync(familyId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.TokenReuseDetected,
				userId,
				actorEmail: null,
				targetId: userId,
				AuditOutcomes.Failure,
				reason: "TokenReuse"),
			cancellationToken);
	}

	private async Task RevokeExpiredSessionAsync(Guid tokenId, Guid userId, CancellationToken cancellationToken)
	{
		await refreshTokenRepository.RevokeAsync(tokenId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.TokenRevoked,
				userId,
				actorEmail: null,
				targetId: userId,
				AuditOutcomes.Failure,
				reason: "SessionExpired"),
			cancellationToken);
	}

	private async Task<AuthResult> RotateAsync(RefreshToken existing, User user, CancellationToken cancellationToken)
	{
		var roles = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
		var generatedToken = jwtService.GenerateToken(user.UserId, user.Email.Value, roles);

		var newRawToken = RawToken.Generate();
		var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenExpiryDays);

		var newRefreshToken = new RefreshToken(
			Guid.NewGuid(),
			user.UserId,
			newRawToken.Hash,
			refreshTokenExpiresAt,
			existing.FamilyId,
			existing.SessionStartedAt,
			clientContext.UserAgent,
			clientContext.IpAddress,
			generatedToken.Jti,
			generatedToken.ExpiresAt);

		await refreshTokenRepository.RevokeAsync(existing.TokenId, cancellationToken);
		await refreshTokenRepository.CreateAsync(newRefreshToken, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.TokenRefreshed,
				user.UserId,
				user.Email.Value,
				targetId: null,
				AuditOutcomes.Success),
			cancellationToken);

		return new AuthResult(generatedToken.Token, newRawToken.Value, generatedToken.ExpiresAt, refreshTokenExpiresAt);
	}
}