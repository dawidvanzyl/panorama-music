using Microsoft.IdentityModel.Tokens;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class JwtServiceTests
{
    [Fact]
    [Trait("AC", "M1UC19")]
    public void GenerateToken_WhenCalledWithUserIdAndRoles_ContainsSubAndRolesClaims()
    {
        var prevSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
        try
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "test-secret-key-that-is-at-least-32-chars!!");
            var service = new JwtService();
            var userId = Guid.NewGuid();
            var roles = new List<Role> { Role.Admin };

            var result = service.GenerateToken(userId, roles);

            var handler = new JwtSecurityTokenHandler();
            var token = result.Token;
            var jwt = handler.ReadJwtToken(token);

            jwt.Subject.ShouldBe(userId.ToString());
            jwt.Claims.ShouldContain(c => c.Type == "roles" && c.Value.Contains("Admin"));
        }
        finally
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", prevSecret);
        }
    }

    [Fact]
    [Trait("AC", "M1UC20")]
    public void GenerateToken_WhenValidatedWithSameSecret_ValidatesSuccessfully()
    {
        const string secret = "test-secret-key-that-is-at-least-32-chars!!";
        var prevSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
        try
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", secret);
            var service = new JwtService();
            var userId = Guid.NewGuid();

            var result = service.GenerateToken(userId, [Role.Admin]);

            var handler = new JwtSecurityTokenHandler();
            var token = result.Token;
            var parameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero,
            };

            var principal = handler.ValidateToken(token, parameters, out _);

            principal.ShouldNotBeNull();
        }
        finally
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", prevSecret);
        }
    }
}
