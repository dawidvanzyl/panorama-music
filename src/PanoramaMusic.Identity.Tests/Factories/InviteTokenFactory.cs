using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Tests.Factories;

public static class InviteTokenFactory
{
	public static InviteToken CreateActive(Guid userId, string tokenHash)
	{
		return new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(7));
	}

	public static InviteToken CreateUsed(Guid userId, string tokenHash)
	{
		var invite = CreateActive(userId, tokenHash);
		invite.MarkUsed();
		return invite;
	}

	public static InviteToken CreateExpired(Guid userId, string tokenHash)
	{
		return new InviteToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.AddDays(-1));
	}
}