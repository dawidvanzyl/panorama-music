using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PanoramaMusic.Identity.Infrastructure.Services;

public class JwtService : IJwtService
{
	private const int _tokenExpiryMinutes = 15;
	private const int _minSecretLength = 32;
	private readonly JwtOptions _options;

	public JwtService(IOptions<JwtOptions> options)
	{
		_options = options.Value;
	}

	public JwtToken GenerateToken(Guid userId, IList<Role> roles)
	{
		var secret = _options.Secret
			?? throw new InvalidOperationException($"'{JwtOptions.SectionName}:{nameof(JwtOptions.Secret)}' is not configured.");

		if (secret.Length < _minSecretLength)
			throw new InvalidOperationException($"JWT secret must be at least {_minSecretLength} characters.");

		var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
		var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

		var now = DateTime.UtcNow;
		var expiresAt = now.AddMinutes(_tokenExpiryMinutes);
		var claims = new List<Claim>
		{
			new(JwtRegisteredClaimNames.Sub, userId.ToString()),
			new("roles", string.Join(",", roles.Select(r => r.ToString()))),
		};

		var descriptor = new SecurityTokenDescriptor
		{
			Subject = new ClaimsIdentity(claims),
			IssuedAt = now,
			Expires = expiresAt,
			SigningCredentials = credentials,
		};

		var handler = new JwtSecurityTokenHandler();
		var token = handler.CreateToken(descriptor);
		return new JwtToken(handler.WriteToken(token), expiresAt);
	}
}