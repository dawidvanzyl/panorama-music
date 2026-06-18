using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Routes.Identity;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using System.Diagnostics.CodeAnalysis;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PanoramaMusic.Identity.Integration.Tests.Fixtures;

public sealed class TestApp(WebApplication app) : IDisposable
{
	private const string _testJwtSecret = "test-jwt-secret-key-must-be-at-least-32-chars";

	public HttpClient Client { get; } = app.GetTestClient();

	[SuppressMessage("Reliability", "CA2012:Use ValueTasks correctly", Justification = "Unit test cleanup")]
	public void Dispose()
	{
		Client.Dispose();
		app.DisposeAsync().GetAwaiter().GetResult();
	}

	public static string GenerateAccessToken(Guid userId, IList<Role> roles)
	{
		var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_testJwtSecret));
		var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
		var claims = new List<Claim>
		{
			new(JwtRegisteredClaimNames.Sub, userId.ToString()),
			new("roles", string.Join(",", roles.Select(r => r.ToString()))),
		};

		var descriptor = new SecurityTokenDescriptor
		{
			Subject = new ClaimsIdentity(claims),
			Expires = DateTime.UtcNow.AddMinutes(15),
			SigningCredentials = credentials,
		};

		var handler = new JwtSecurityTokenHandler();
		return handler.WriteToken(handler.CreateToken(descriptor));
	}

	public static TestApp CreateTestApp(
		Mock<IUserRepository>? userRepo = null,
		Mock<IUserRoleRepository>? roleRepo = null,
		Mock<IPasswordHasher>? hasher = null,
		Mock<IJwtService>? jwt = null,
		Mock<IRefreshTokenRepository>? refreshRepo = null,
		Mock<IInviteTokenRepository>? inviteRepo = null,
		Mock<IPasswordResetTokenRepository>? resetTokenRepo = null,
		Mock<IEmailSender>? emailSender = null,
		string seedAdminEmail = "")
	{
		var builder = WebApplication.CreateBuilder();
		builder.WebHost.UseTestServer();
		builder.Environment.EnvironmentName = "Testing";

		builder.Services.Configure<AdminOptions>(opts => opts.Email = seedAdminEmail);
		builder.Services.AddSingleton<IAdminOptions>(sp => sp.GetRequiredService<IOptions<AdminOptions>>().Value);
		builder.Services.AddHttpContextAccessor();
		builder.Services.AddScoped(sp => sp.GetRequiredService<IHttpContextAccessor>().HttpContext?.User ?? new ClaimsPrincipal(new ClaimsIdentity()));
		builder.Services.AddTransient(_ => (userRepo ?? new Mock<IUserRepository>()).Object);
		builder.Services.AddTransient(_ => (roleRepo ?? new Mock<IUserRoleRepository>()).Object);
		builder.Services.AddTransient(_ => (hasher ?? new Mock<IPasswordHasher>()).Object);
		builder.Services.AddTransient(_ => (jwt ?? new Mock<IJwtService>()).Object);
		builder.Services.AddTransient(_ => (refreshRepo ?? new Mock<IRefreshTokenRepository>()).Object);
		builder.Services.AddTransient(_ => (inviteRepo ?? new Mock<IInviteTokenRepository>()).Object);
		builder.Services.AddTransient(_ => (resetTokenRepo ?? new Mock<IPasswordResetTokenRepository>()).Object);
		builder.Services.AddTransient(_ => (emailSender ?? new Mock<IEmailSender>()).Object);

		builder.Services.AddTransient<LoginHandler>();
		builder.Services.AddTransient<RefreshTokenHandler>();
		builder.Services.AddTransient<LogoutHandler>();
		builder.Services.AddTransient<CompleteRegistrationHandler>();
		builder.Services.AddTransient<CreateUserHandler>();
		builder.Services.AddTransient<RegenerateInviteTokenHandler>();
		builder.Services.AddTransient<GetUsersHandler>();
		builder.Services.AddTransient<UpdateUserRolesHandler>();
		builder.Services.AddTransient<RequestPasswordResetHandler>();
		builder.Services.AddTransient<ResetPasswordHandler>();

		builder.Services.AddExceptionHandler<DomainExceptionHandler>();
		builder.Services.AddProblemDetails();

		builder.Services
			.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
			.AddJwtBearer(options =>
			{
				options.MapInboundClaims = false;
				options.TokenValidationParameters = new TokenValidationParameters
				{
					ValidateIssuer = false,
					ValidateAudience = false,
					ValidateLifetime = true,
					ValidateIssuerSigningKey = true,
					IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_testJwtSecret)),
				};
			});

		builder.Services
			.AddAuthorizationBuilder()
			.AddPolicy("AdminPolicy", policy => policy.RequireAssertion(ctx => ctx.User.HasRole(Role.Admin)));

		var app = builder.Build();
		app.UseExceptionHandler();
		app.UseAuthentication();
		app.UseAuthorization();
		app.MapAuthRoutes();
		app.MapAdminRoutes();

		app
			.StartAsync()
			.GetAwaiter()
			.GetResult();

		return new TestApp(app);
	}
}