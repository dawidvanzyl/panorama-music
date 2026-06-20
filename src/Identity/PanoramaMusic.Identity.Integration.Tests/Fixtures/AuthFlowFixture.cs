using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Integration.Tests.Fixtures;

public class AuthFlowFixture
{
	public DateTime FixedNow { get; }
	public string TestToken { get; }
	public string TestTokenHash { get; }

	public AuthFlowFixture()
	{
		FixedNow = DateTime.UtcNow;
		TestToken = "test-refresh-token-raw";
		TestTokenHash = RawToken.From(TestToken).Hash;
	}

	public User CreateActiveUser(string email = "user@test.com")
	{
		var user = new User(Guid.NewGuid(), Email.Create(email), FixedNow);
		user.SetPassword(PasswordHash.Create("$argon2id$v=19$valid-hash"));
		user.Activate();
		return user;
	}

	public RefreshToken CreateValidRefreshToken(Guid userId)
	{
		return new RefreshToken(Guid.NewGuid(), userId, TestTokenHash, FixedNow.AddDays(7));
	}

	public InviteToken CreateValidInviteToken(Guid userId)
	{
		return new InviteToken(Guid.NewGuid(), userId, TestTokenHash, FixedNow.AddDays(7));
	}

	public PasswordResetToken CreateValidPasswordResetToken(Guid userId)
	{
		return new PasswordResetToken(Guid.NewGuid(), userId, TestTokenHash, FixedNow.AddHours(1));
	}
}