using Moq;
using Moq.Protected;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using System.Net;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class MailerooMailSenderTests
{
	private static readonly Uri _baseAddress = new("https://smtp.maileroo.com/");

	private static readonly EmailMessage _message = new(
		"user@example.com",
		"admin@panorama-music.com",
		"noreply@panorama-music.com",
		"Panorama Music",
		"Reset your Panorama Music password",
		"<p>Click here</p>");

	private readonly Mock<HttpMessageHandler> _handler = new();
	private readonly MailerooMailSender _mailerooMailSender;

	public MailerooMailSenderTests()
	{
		var httpClient = new HttpClient(_handler.Object) { BaseAddress = _baseAddress };
		httpClient.DefaultRequestHeaders.Add("X-API-Key", "test-api-key");
		_mailerooMailSender = new MailerooMailSender(httpClient);
	}

	private void SetupResponse(HttpStatusCode statusCode, string content)
	{
		_handler.Protected()
			.Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
			.ReturnsAsync(new HttpResponseMessage(statusCode) { Content = new StringContent(content) });
	}

	[Fact]
	[Trait("AC", "181UC1")]
	public async Task SendAsync_ProviderIsMaileroo_PostsToEmailsEndpointWithApiKeyHeaderAndCorrectBody()
	{
		HttpRequestMessage? capturedRequest = null;
		_handler.Protected()
			.Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
			.Callback<HttpRequestMessage, CancellationToken>((request, _) => capturedRequest = request)
			.ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"success":true,"message":"queued"}""") });

		await _mailerooMailSender.SendAsync(_message, TestContext.Current.CancellationToken);

		capturedRequest.ShouldNotBeNull();
		capturedRequest!.Method.ShouldBe(HttpMethod.Post);
		capturedRequest.RequestUri.ShouldBe(new Uri(_baseAddress, "api/v2/emails"));
		capturedRequest.Headers.Authorization.ShouldBeNull();
		capturedRequest.Headers.TryGetValues("X-API-Key", out var apiKeyValues).ShouldBeTrue();
		apiKeyValues!.ShouldContain("test-api-key");

		var body = await capturedRequest.Content!.ReadAsStringAsync(TestContext.Current.CancellationToken);
		using var json = JsonDocument.Parse(body);
		json.RootElement.GetProperty("from").GetProperty("address").GetString().ShouldBe(_message.From);
		json.RootElement.GetProperty("reply_to").GetProperty("address").GetString().ShouldBe(_message.ReplyTo);
		json.RootElement.GetProperty("from").GetProperty("display_name").GetString().ShouldBe(_message.FromDisplayName);
		json.RootElement.GetProperty("to")[0].GetProperty("address").GetString().ShouldBe(_message.To);
		json.RootElement.GetProperty("subject").GetString().ShouldBe(_message.Subject);
		json.RootElement.GetProperty("html").GetString().ShouldBe(_message.Html);
	}

	[Fact]
	[Trait("AC", "181UC2")]
	public async Task SendAsync_MailerooReturnsNonSuccessBody_ThrowsRatherThanSucceeding()
	{
		SetupResponse(HttpStatusCode.OK, """{"success":false,"message":"invalid from domain"}""");

		await Should.ThrowAsync<InvalidOperationException>(() =>
			_mailerooMailSender.SendAsync(_message, TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "181UC2")]
	public async Task SendAsync_MailerooReturnsNon2xxStatus_ThrowsRatherThanSucceeding()
	{
		SetupResponse(HttpStatusCode.BadRequest, """{"success":false,"message":"bad request"}""");

		await Should.ThrowAsync<InvalidOperationException>(() =>
			_mailerooMailSender.SendAsync(_message, TestContext.Current.CancellationToken));
	}
}