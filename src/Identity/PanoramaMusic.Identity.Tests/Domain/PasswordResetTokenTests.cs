using PanoramaMusic.Identity.Domain.Entities;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Domain;

public class PasswordResetTokenTests
{
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