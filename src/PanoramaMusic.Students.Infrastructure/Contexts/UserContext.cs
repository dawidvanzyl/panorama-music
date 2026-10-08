using Microsoft.AspNetCore.Http;
using PanoramaMusic.Infrastructure.Contexts.Bases;
using PanoramaMusic.Students.Application.Interfaces;

namespace PanoramaMusic.Students.Infrastructure.Contexts;

public sealed class UserContext(IHttpContextAccessor accessor) : UserContextBase(accessor), IUserContext
{
	// "roles" is one claim holding a comma-separated list.
	private const string _rolesClaimType = "roles";
	private const string _teacherRole = "Teacher";

	public bool IsTeacher =>
		User?.FindFirst(_rolesClaimType)?.Value
			?.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
			.Any(role => string.Equals(role, _teacherRole, StringComparison.OrdinalIgnoreCase))
		?? false;
}