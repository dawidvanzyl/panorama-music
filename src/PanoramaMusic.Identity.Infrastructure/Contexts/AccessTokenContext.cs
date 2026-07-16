using Microsoft.AspNetCore.Http;
using PanoramaMusic.Identity.Application.Interfaces;
using System.IdentityModel.Tokens.Jwt;

namespace PanoramaMusic.Identity.Infrastructure.Contexts;

public sealed class AccessTokenContext(IHttpContextAccessor accessor) : IAccessTokenContext
{
	public Guid? Jti
	{
		get
		{
			var value = accessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
			return Guid.TryParse(value, out var jti) ? jti : null;
		}
	}

	public DateTime? ExpiresAtUtc
	{
		get
		{
			var value = accessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;
			return long.TryParse(value, out var seconds)
				? DateTimeOffset.FromUnixTimeSeconds(seconds).UtcDateTime
				: null;
		}
	}
}