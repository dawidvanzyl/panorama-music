using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Identity.Application.Extensions;

public static class UserContextExtensions
{
	/// <summary>
	/// The authenticated user's id. Throws when no authenticated user is present —
	/// for use only where the endpoint's authorization policy already guarantees
	/// authentication (e.g. admin-only handlers). Signals a wiring bug rather than
	/// a normal auth failure, so it is not one of the domain's request-facing
	/// exceptions.
	/// </summary>
	public static Guid GetRequiredUserId(this IUserContext userContext) =>
		userContext.UserId ?? throw new InvalidOperationException("No authenticated user is present in the current request context.");
}