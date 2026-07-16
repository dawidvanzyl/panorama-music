using PanoramaMusic.Identity.Domain.Entities;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Domain.Tests;

public class InviteTokenTests
{
	[Fact]
	[Trait("AC", "M1UC9")]
	public void MarkUsed_WhenValid_SetsUsedAt()
	{
		var token = new InviteToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddHours(1));

		token.MarkUsed();

		token.IsUsed.ShouldBeTrue();
		token.UsedAt.ShouldNotBeNull();
	}
}