using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class SecurityHeadersTests(ApiTestFixture fixture)
{
	private const string _password = "SecurityHeadersTests123!";

	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task GetRoot_StaticHtmlResponse_CarriesSecurityHeadersIncludingCoop()
	{
		var client = fixture.CreateClient();

		var response = await client.GetAsync("/", TestContext.Current.CancellationToken);

		response.Content.Headers.ContentType?.MediaType.ShouldBe("text/html");
		response.Headers.GetValues("Strict-Transport-Security").ShouldContain("max-age=31536000; includeSubDomains");
		response.Headers.GetValues("X-Content-Type-Options").ShouldContain("nosniff");
		response.Headers.GetValues("Referrer-Policy").ShouldContain("no-referrer");
		response.Headers.GetValues("Content-Security-Policy").Single().ShouldContain("object-src 'none'");
		response.Headers.GetValues("Cross-Origin-Opener-Policy").ShouldContain("same-origin");
	}

	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task GetHealth_JsonResponse_CarriesSecurityHeadersWithoutCoop()
	{
		var client = fixture.CreateClient();

		var response = await client.GetAsync("/api/health", TestContext.Current.CancellationToken);

		response.Content.Headers.ContentType?.MediaType.ShouldBe("application/json");
		response.Headers.GetValues("Strict-Transport-Security").ShouldContain("max-age=31536000; includeSubDomains");
		response.Headers.GetValues("X-Content-Type-Options").ShouldContain("nosniff");
		response.Headers.GetValues("Referrer-Policy").ShouldContain("no-referrer");
		response.Headers.GetValues("Content-Security-Policy").Single().ShouldContain("object-src 'none'");
		response.Headers.Contains("Cross-Origin-Opener-Policy").ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task PostLogin_SensitiveEndpoint_CarriesCacheControlNoStore()
	{
		var client = fixture.CreateClient();

		var response = await client.PostAsJsonAsync("/api/auth/login", new { }, TestContext.Current.CancellationToken);

		response.Headers.GetValues("Cache-Control").ShouldContain(value => value.Contains("no-store"));
	}

	[Fact]
	[Trait("AC", "M1.5UC11")]
	public async Task GetAudit_SensitiveEndpoint_CarriesCacheControlNoStore()
	{
		var (adminEmail, _) = await SeedActiveUserAsync(Role.Admin);
		var client = fixture.CreateClient();
		var (accessToken, _) = await LoginAsync(client, adminEmail);

		var request = new HttpRequestMessage(HttpMethod.Get, "/api/audit");
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
		var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

		response.Headers.GetValues("Cache-Control").ShouldContain(value => value.Contains("no-store"));
	}

	private async Task<(string Email, Guid UserId)> SeedActiveUserAsync(Role? role = null)
	{
		using var scope = fixture.Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var userRoleRepository = scope.ServiceProvider.GetRequiredService<IUserRoleRepository>();
		var passwordHashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

		var email = $"security-headers-{Guid.NewGuid()}@example.com";
		var user = new User(Guid.NewGuid(), Email.Create(email), DateTime.UtcNow);
		user.SetPassword(passwordHashService.Hash(_password));
		user.Activate();

		await unitOfWork.BeginAsync(TestContext.Current.CancellationToken);
		await userRepository.CreateAsync(user, TestContext.Current.CancellationToken);
		await userRepository.UpdatePasswordAsync(user.UserId, user.PasswordHash!.Value, clearRequiresPasswordReset: false, TestContext.Current.CancellationToken);

		if (role.HasValue)
			await userRoleRepository.CreateAsync(new UserRole(user.UserId, role.Value), TestContext.Current.CancellationToken);

		await unitOfWork.CommitAsync(TestContext.Current.CancellationToken);

		return (email, user.UserId);
	}

	private async Task<(string AccessToken, string RefreshTokenCookie)> LoginAsync(HttpClient client, string email)
	{
		var response = await client.PostAsJsonAsync(
			"/api/auth/login",
			new LoginRequest(email, _password),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(System.Net.HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<AccessTokenResult>(TestContext.Current.CancellationToken);

		var setCookie = response.Headers.GetValues("Set-Cookie").Single(v => v.StartsWith("__Secure-refresh_token=", StringComparison.Ordinal));
		var refreshTokenCookie = System.Text.RegularExpressions.Regex.Match(setCookie, "__Secure-refresh_token=([^;]+)").Groups[1].Value;

		return (result!.AccessToken, refreshTokenCookie);
	}
}