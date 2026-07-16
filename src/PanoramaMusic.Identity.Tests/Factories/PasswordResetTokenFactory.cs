using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Tests.Factories;

public static class PasswordResetTokenFactory
{
	public static PasswordResetToken CreateValid(string rawToken, Guid? userId = null)
	{
		return new PasswordResetToken(Guid.NewGuid(), userId ?? Guid.NewGuid(), RawToken.From(rawToken).Hash, DateTime.UtcNow.AddHours(1));
	}

	public static PasswordResetToken CreateUsed(string rawToken, Guid? userId = null)
	{
		var token = CreateValid(rawToken, userId);
		token.MarkUsed();
		return token;
	}

	public static PasswordResetToken CreateExpired(string rawToken, Guid? userId = null)
	{
		return new PasswordResetToken(Guid.NewGuid(), userId ?? Guid.NewGuid(), RawToken.From(rawToken).Hash, DateTime.UtcNow.AddMinutes(-1));
	}
}