using Microsoft.AspNetCore.Http;
using PanoramaMusic.Students.Application.Interfaces;

namespace PanoramaMusic.Students.Infrastructure.Contexts;

public sealed class UserContext(IHttpContextAccessor accessor) : IUserContext
{
	// "sub"/"email" mirror the JwtRegisteredClaimNames values Identity's own
	// UserContext reads — duplicated by contract rather than taking a
	// cross-context dependency on Identity's Application/Infrastructure layers.
	private const string _subjectClaimType = "sub";
	private const string _emailClaimType = "email";

	public Guid? UserId =>
		Guid.TryParse(accessor.HttpContext?.User.FindFirst(_subjectClaimType)?.Value, out var userId)
			? userId
			: null;

	public string? Email => accessor.HttpContext?.User.FindFirst(_emailClaimType)?.Value;
}