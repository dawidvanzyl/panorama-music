using Microsoft.AspNetCore.Http;
using PanoramaMusic.Identity.Application;
using System.Security.Claims;

namespace PanoramaMusic.Identity.Infrastructure.Services;

public sealed class UserContext(IHttpContextAccessor accessor) : IUserContext
{
	public Guid UserId => Guid.Parse(accessor.HttpContext!.User.FindFirst("sub")!.Value);
}