using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Domain;

public class PasswordResetTokenTests
{
	[Fact]
	[Trait("AC", "M1.1UC7")]
	public void MarkUsed_WhenExpired_ThrowsInvalidResetTokenException()
	{
		var token = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddMinutes(-1));

		Should.Throw<InvalidResetTokenException>(() => token.MarkUsed());
	}

	[Fact]
	[Trait("AC", "M1.1UC7")]
	public void MarkUsed_WhenAlreadyUsed_ThrowsInvalidResetTokenException()
	{
		var token = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddHours(1));
		token.MarkUsed();

		Should.Throw<InvalidResetTokenException>(() => token.MarkUsed());
	}

	[Fact]
	[Trait("AC", "M1.1UC6")]
	public void MarkUsed_WhenValid_SetsUsedAt()
	{
		var token = new PasswordResetToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddHours(1));

		token.MarkUsed();

		token.IsUsed.ShouldBeTrue();
		token.UsedAt.ShouldNotBeNull();
	}
}