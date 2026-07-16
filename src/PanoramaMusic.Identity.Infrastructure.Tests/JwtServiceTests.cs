using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Infrastructure.Services;
using PanoramaMusic.Identity.Tests;
using Shouldly;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Xunit;

namespace PanoramaMusic.Identity.Infrastructure.Tests;

public class JwtServiceTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly JwtService _service;

	public JwtServiceTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_context.Options.JwtOptionsMock.Object.Secret = "test-secret-key-that-is-at-least-32-chars!!";
		_context.Options.JwtOptionsMock.Object.Issuer = "panorama-music-api";
		_context.Options.JwtOptionsMock.Object.Audience = "panorama-music-client";
		_service = _context.ServiceProvider.GetRequiredService<JwtService>();
	}

	[Fact]
	[Trait("AC", "M1UC19")]
	public void GenerateToken_WhenCalledWithUserIdAndRoles_ContainsSubAndRolesClaims()
	{
		var userId = Guid.NewGuid();
		var roles = new List<Role> { Role.Admin };

		var result = _service.GenerateToken(userId, "admin@test.com", roles);

		var handler = new JwtSecurityTokenHandler();
		var token = result.Token;
		var jwt = handler.ReadJwtToken(token);

		jwt.ShouldSatisfyAllConditions(
			() => jwt.Subject.ShouldBe(userId.ToString()),
			() => jwt.Claims.ShouldContain(c => c.Type == "roles" && c.Value.Contains("Admin")),
			() => jwt.Claims.ShouldContain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == "admin@test.com")
		);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public void GenerateToken_WhenCalled_ContainsUniqueJtiAndConfiguredIssuerAndAudience()
	{
		_context.Options.JwtOptionsMock.Object.Issuer = "test-issuer";
		_context.Options.JwtOptionsMock.Object.Audience = "test-audience";

		var first = _service.GenerateToken(Guid.NewGuid(), "admin@test.com", [Role.Admin]);
		var second = _service.GenerateToken(Guid.NewGuid(), "admin@test.com", [Role.Admin]);

		var handler = new JwtSecurityTokenHandler();
		var firstJwt = handler.ReadJwtToken(first.Token);
		var secondJwt = handler.ReadJwtToken(second.Token);

		firstJwt.ShouldSatisfyAllConditions(
			() => firstJwt.Claims.ShouldContain(c => c.Type == JwtRegisteredClaimNames.Jti),
			() => firstJwt.Issuer.ShouldBe("test-issuer"),
			() => firstJwt.Audiences.ShouldContain("test-audience")
		);
		firstJwt.Id.ShouldNotBe(secondJwt.Id);

		// The returned JwtToken.Jti must match the jti actually embedded in the token, so
		// callers (session revocation) can denylist the exact access token that was issued.
		first.Jti.ToString().ShouldBe(firstJwt.Id);
		second.Jti.ToString().ShouldBe(secondJwt.Id);
	}

	[Fact]
	[Trait("AC", "M1UC20")]
	public void GenerateToken_WhenValidatedWithSameSecret_ValidatesSuccessfully()
	{
		const string secret = "test-secret-key-that-is-at-least-32-chars!!";
		_context.Options.JwtOptionsMock.Object.Secret = secret;
		_context.Options.JwtOptionsMock.Object.Issuer = "test-issuer";
		_context.Options.JwtOptionsMock.Object.Audience = "test-audience";
		var userId = Guid.NewGuid();

		var result = _service.GenerateToken(userId, "admin@test.com", [Role.Admin]);

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
		_context.Options.JwtOptionsMock.Object.Secret = secret;
		_context.Options.JwtOptionsMock.Object.Issuer = "test-issuer";
		_context.Options.JwtOptionsMock.Object.Audience = "test-audience";
		var result = _service.GenerateToken(Guid.NewGuid(), "admin@test.com", [Role.Admin]);

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