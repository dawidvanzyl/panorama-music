using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Domain;

public class InviteTokenTests
{
	[Fact]
	[Trait("AC", "M1UC9")]
	public void MarkUsed_WhenExpired_ThrowsDomainException()
	{
		var token = new InviteToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddMinutes(-1));

		Should.Throw<DomainException>(() => token.MarkUsed());
	}

	[Fact]
	[Trait("AC", "M1UC10")]
	public void MarkUsed_WhenAlreadyUsed_ThrowsDomainException()
	{
		var token = new InviteToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddHours(1));
		token.MarkUsed();

		Should.Throw<DomainException>(() => token.MarkUsed());
	}
}