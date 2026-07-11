using Microsoft.AspNetCore.Http;
using PanoramaMusic.Identity.Application.Interfaces;
using System.IdentityModel.Tokens.Jwt;

namespace PanoramaMusic.Identity.Infrastructure.Contexts;

public sealed class UserContext(IHttpContextAccessor accessor) : IUserContext
{
	public Guid? UserId =>
		Guid.TryParse(accessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var userId)
			? userId
			: null;

	public string? Email => accessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Email)?.Value;
}