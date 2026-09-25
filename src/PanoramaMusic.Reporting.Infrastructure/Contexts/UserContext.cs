using Microsoft.AspNetCore.Http;
using PanoramaMusic.Reporting.Application.Interfaces;

namespace PanoramaMusic.Reporting.Infrastructure.Contexts;

public sealed class UserContext(IHttpContextAccessor accessor) : IUserContext
{
	// "sub"/"email" mirror the claim types Identity's own UserContext and
	// ClaimsPrincipalExtensions read — duplicated by contract rather than
	// taking a cross-context dependency on Identity's Application/Infrastructure
	// layers.
	private const string _subjectClaimType = "sub";
	private const string _emailClaimType = "email";

	public Guid? UserId =>
		Guid.TryParse(accessor.HttpContext?.User.FindFirst(_subjectClaimType)?.Value, out var userId)
			? userId
			: null;

	public string? Email => accessor.HttpContext?.User.FindFirst(_emailClaimType)?.Value;
}
