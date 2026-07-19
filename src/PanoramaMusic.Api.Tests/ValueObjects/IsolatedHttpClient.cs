using PanoramaMusic.Audit.Application.Models;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Auth;
using Shouldly;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Xunit;

namespace PanoramaMusic.Api.Tests.ValueObjects;

internal class IsolatedHttpClient(HttpClient client)
{
	internal string AccessToken { get; private set; } = string.Empty;
	internal string RefreshTokenCookie { get; private set; } = string.Empty;

	internal HttpClient Client { get; } = client;

	internal async Task LoginAsync(string email, string password)
	{
		var response = await Client.PostAsJsonAsync(
			"/api/auth/login",
			new LoginRequest(email, password),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<AccessTokenResult>(TestContext.Current.CancellationToken);

		AccessToken = result!.AccessToken;

		var setCookie = response.Headers.GetValues("Set-Cookie").Single(v => v.StartsWith("__Secure-refresh_token=", StringComparison.Ordinal));
		RefreshTokenCookie = Regex.Match(setCookie, "__Secure-refresh_token=([^;]+)").Groups[1].Value;
	}

	internal async Task FailedLoginAsync(string email, string password)
	{
		var response = await Client.PostAsJsonAsync(
			"/api/auth/login",
			new LoginRequest(email, password),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	internal async Task<GetAuditEventsResult> GetAuditPageAsync(
		string? actor,
		string eventType,
		int page,
		int pageSize,
		string? to = null,
		string? from = null)
	{
		var actorQuery = actor is null ? string.Empty : $"actor={Uri.EscapeDataString(actor)}&";
		var toQuery = to is null ? string.Empty : $"to={Uri.EscapeDataString(to)}&";
		var fromQuery = from is null ? string.Empty : $"from={Uri.EscapeDataString(from)}&";
		var path = $"/api/audit?{actorQuery}{fromQuery}{toQuery}eventType={Uri.EscapeDataString(eventType)}&page={page}&pageSize={pageSize}";
		var response = await Client.SendAsync(AuthorizedGetRequest(path), TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		return (await response.Content.ReadFromJsonAsync<GetAuditEventsResult>(TestContext.Current.CancellationToken))!;
	}

	internal HttpRequestMessage AuthorizedGetRequest(string path) => AuthorizedRequest(HttpMethod.Get, path, AccessToken);

	internal HttpRequestMessage AuthorizedPostRequest(string path) => AuthorizedRequest(HttpMethod.Post, path, AccessToken);

	internal HttpRequestMessage AuthorizedPostRequest<T>(string path, T body)
	{
		var request = AuthorizedRequest(HttpMethod.Post, path, AccessToken);
		request.Content = JsonContent.Create(body);
		return request;
	}

	internal HttpRequestMessage AuthorizedPatchRequest<T>(string path, T body)
	{
		var request = AuthorizedRequest(HttpMethod.Patch, path, AccessToken);
		request.Content = JsonContent.Create(body);
		return request;
	}

	internal HttpRequestMessage AuthorizedDeleteRequest(string path) => AuthorizedRequest(HttpMethod.Delete, path, AccessToken);

	// __Secure- prefixed cookies aren't resent automatically by HttpClient's cookie
	// handling over the in-memory (HTTP, not HTTPS) test host, so endpoints that resolve
	// the caller's current session from that cookie (revoke-all-others, revoke-all-global)
	// need it attached explicitly.
	internal HttpRequestMessage AuthorizedDeleteRequestWithSessionCookie(string path, string sessionCookie)
	{
		var request = AuthorizedDeleteRequest(path);
		request.Headers.Add("Cookie", $"__Secure-refresh_token={sessionCookie}");
		return request;
	}

	internal HttpRequestMessage AuthorizedRequest(HttpMethod method, string path, string accessToken)
	{
		var request = new HttpRequestMessage(method, path);
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
		return request;
	}
}