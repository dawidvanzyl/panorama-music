using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace PanoramaMusic.Infrastructure.Contexts.Bases;

public abstract class UserContextBase(IHttpContextAccessor accessor)
{
	private const string _subjectClaimType = "sub";
	private const string _emailClaimType = "email";

	protected ClaimsPrincipal? User => accessor.HttpContext?.User;

	public Guid? UserId =>
		Guid.TryParse(User?.FindFirst(_subjectClaimType)?.Value, out var userId)
			? userId
			: null;

	public string? Email => User?.FindFirst(_emailClaimType)?.Value;
}