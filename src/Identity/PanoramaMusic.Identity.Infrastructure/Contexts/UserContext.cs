using Microsoft.AspNetCore.Http;
using PanoramaMusic.Identity.Application.Interfaces;
using System.Security.Claims;

namespace PanoramaMusic.Identity.Infrastructure.Contexts;

public sealed class UserContext(IHttpContextAccessor accessor) : IUserContext
{
	public Guid UserId => Guid.Parse(accessor.HttpContext!.User.FindFirst("sub")!.Value);
}