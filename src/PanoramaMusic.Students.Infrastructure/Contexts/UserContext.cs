using Microsoft.AspNetCore.Http;
using PanoramaMusic.Students.Application.Interfaces;

namespace PanoramaMusic.Students.Infrastructure.Contexts;

public sealed class UserContext(IHttpContextAccessor accessor) : IUserContext
{
	// "sub"/"email"/"roles" mirror the claim types Identity's own UserContext
	// and ClaimsPrincipalExtensions read — duplicated by contract rather than
	// taking a cross-context dependency on Identity's Application/Infrastructure
	// layers. "roles" is one claim holding a comma-separated list.
	private const string _subjectClaimType = "sub";
	private const string _emailClaimType = "email";
	private const string _rolesClaimType = "roles";
	private const string _teacherRole = "Teacher";

	public Guid? UserId =>
		Guid.TryParse(accessor.HttpContext?.User.FindFirst(_subjectClaimType)?.Value, out var userId)
			? userId
			: null;

	public string? Email => accessor.HttpContext?.User.FindFirst(_emailClaimType)?.Value;

	public bool IsTeacher =>
		accessor.HttpContext?.User.FindFirst(_rolesClaimType)?.Value
			?.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
			.Any(role => string.Equals(role, _teacherRole, StringComparison.OrdinalIgnoreCase))
		?? false;
}