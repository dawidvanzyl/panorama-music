using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// HMAC-SHA256 JWT implementation of <see cref="IJwtService"/>.
/// Reads JWT_SECRET from the environment. Token TTL is 15 minutes.
/// </summary>
public class JwtService : IJwtService
{
    private const int TokenExpiryMinutes = 15;
    private const int MinSecretLength    = 32;

    public string GenerateToken(Guid userId, IList<Role> roles)
    {
        var secret = Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT_SECRET environment variable is not configured.");

        if (secret.Length < MinSecretLength)
            throw new InvalidOperationException($"JWT_SECRET must be at least {MinSecretLength} characters.");

        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var now    = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new("roles", string.Join(",", roles.Select(r => r.ToString()))),
        };

        var descriptor = new SecurityTokenDescriptor
        {
            Subject            = new ClaimsIdentity(claims),
            IssuedAt           = now,
            Expires            = now.AddMinutes(TokenExpiryMinutes),
            SigningCredentials  = credentials,
        };

        var handler = new JwtSecurityTokenHandler();
        var token   = handler.CreateToken(descriptor);
        return handler.WriteToken(token);
    }
}
