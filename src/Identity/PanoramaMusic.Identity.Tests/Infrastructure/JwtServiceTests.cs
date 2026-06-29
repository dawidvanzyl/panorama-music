using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class JwtServiceTests
{
	private static JwtService CreateService(string secret, string issuer = "panorama-music-api", string audience = "panorama-music-client")
	{
		var options = Options.Create(new JwtOptions { Secret = secret, Issuer = issuer, Audience = audience });
		return new JwtService(options);
	}

	[Fact]
	[Trait("AC", "M1UC19")]
	public void GenerateToken_WhenCalledWithUserIdAndRoles_ContainsSubAndRolesClaims()
	{
		var service = CreateService("test-secret-key-that-is-at-least-32-chars!!");
		var userId = Guid.NewGuid();
		var roles = new List<Role> { Role.Admin };

		var result = service.GenerateToken(userId, roles);

		var handler = new JwtSecurityTokenHandler();
		var token = result.Token;
		var jwt = handler.ReadJwtToken(token);

		jwt.ShouldSatisfyAllConditions(
			() => jwt.Subject.ShouldBe(userId.ToString()),
			() => jwt.Claims.ShouldContain(c => c.Type == "roles" && c.Value.Contains("Admin"))
		);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public void GenerateToken_WhenCalled_ContainsUniqueJtiAndConfiguredIssuerAndAudience()
	{
		var service = CreateService("test-secret-key-that-is-at-least-32-chars!!", issuer: "test-issuer", audience: "test-audience");

		var first = service.GenerateToken(Guid.NewGuid(), [Role.Admin]);
		var second = service.GenerateToken(Guid.NewGuid(), [Role.Admin]);

		var handler = new JwtSecurityTokenHandler();
		var firstJwt = handler.ReadJwtToken(first.Token);
		var secondJwt = handler.ReadJwtToken(second.Token);

		firstJwt.ShouldSatisfyAllConditions(
			() => firstJwt.Claims.ShouldContain(c => c.Type == JwtRegisteredClaimNames.Jti),
			() => firstJwt.Issuer.ShouldBe("test-issuer"),
			() => firstJwt.Audiences.ShouldContain("test-audience")
		);
		firstJwt.Id.ShouldNotBe(secondJwt.Id);
	}

	[Fact]
	[Trait("AC", "M1UC20")]
	public void GenerateToken_WhenValidatedWithSameSecret_ValidatesSuccessfully()
	{
		const string secret = "test-secret-key-that-is-at-least-32-chars!!";
		var service = CreateService(secret, issuer: "test-issuer", audience: "test-audience");
		var userId = Guid.NewGuid();

		var result = service.GenerateToken(userId, [Role.Admin]);

		var handler = new JwtSecurityTokenHandler();
		var token = result.Token;
		var parameters = new TokenValidationParameters
		{
			ValidateIssuerSigningKey = true,
			IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
			ValidateIssuer = true,
			ValidIssuer = "test-issuer",
			ValidateAudience = true,
			ValidAudience = "test-audience",
			ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
			ClockSkew = TimeSpan.Zero,
		};

		var principal = handler.ValidateToken(token, parameters, out _);

		principal.ShouldNotBeNull();
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public void ValidateToken_WhenAudienceDoesNotMatch_ThrowsSecurityTokenException()
	{
		const string secret = "test-secret-key-that-is-at-least-32-chars!!";
		var service = CreateService(secret, issuer: "test-issuer", audience: "test-audience");
		var result = service.GenerateToken(Guid.NewGuid(), [Role.Admin]);

		var handler = new JwtSecurityTokenHandler();
		var parameters = new TokenValidationParameters
		{
			ValidateIssuerSigningKey = true,
			IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
			ValidateIssuer = true,
			ValidIssuer = "test-issuer",
			ValidateAudience = true,
			ValidAudience = "a-different-audience",
			ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
		};

		Should.Throw<SecurityTokenException>(() => handler.ValidateToken(result.Token, parameters, out _));
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public void ValidateToken_WhenTokenUsesNoneAlgorithmAndIsUnsigned_ThrowsSecurityTokenException()
	{
		const string secret = "test-secret-key-that-is-at-least-32-chars!!";
		var unsignedToken = new JwtSecurityToken(
			issuer: "test-issuer",
			audience: "test-audience",
			claims: [new(JwtRegisteredClaimNames.Sub, Guid.NewGuid().ToString())],
			expires: DateTime.UtcNow.AddMinutes(15));

		var handler = new JwtSecurityTokenHandler();
		var rawToken = handler.WriteToken(unsignedToken);

		// Mirrors the production TokenValidationParameters in ServiceCollectionExtensions —
		// RequireSignedTokens defaults to true, so a none-alg, unsigned token is rejected for
		// lacking a signature at all, never mind one that doesn't match the HMAC allowlist.
		var parameters = new TokenValidationParameters
		{
			ValidateIssuerSigningKey = true,
			IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
			ValidateIssuer = true,
			ValidIssuer = "test-issuer",
			ValidateAudience = true,
			ValidAudience = "test-audience",
			ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
		};

		Should.Throw<SecurityTokenException>(() => handler.ValidateToken(rawToken, parameters, out _));
	}
}