using Microsoft.Extensions.DependencyInjection;
using Moq;
using Moq.Protected;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Tests;
using Shouldly;
using System.Net;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Identity.Infrastructure.Tests;

public class MailerooMailSenderTests : IClassFixture<IdentityTestFixture>
{
	private static readonly EmailMessage _message = new(
		"user@example.com",
		"admin@panorama-music.com",
		"noreply@panorama-music.com",
		"Panorama Music",
		"Reset your Panorama Music password",
		"<p>Click here</p>");

	private readonly IdentityTestContext _context;
	private readonly IMailSender _mailSender;

	public MailerooMailSenderTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_mailSender = _context.ServiceProvider.GetRequiredService<IMailSender>();
	}

	[Fact]
	[Trait("AC", "181UC1")]
	public async Task SendAsync_ProviderIsMaileroo_PostsToEmailsEndpointWithBearerAuthAndCorrectBody()
	{
		HttpRequestMessage? capturedRequest = null;
		_context.Services.HttpMessageHandlerMock.Protected()
			.Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
			.Callback<HttpRequestMessage, CancellationToken>((request, _) => capturedRequest = request)
			.ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"success":true,"message":"queued"}""") });

		await _mailSender.SendAsync(_message, TestContext.Current.CancellationToken);

		capturedRequest.ShouldNotBeNull();
		capturedRequest!.Method.ShouldBe(HttpMethod.Post);
		capturedRequest.RequestUri.ShouldBe(new Uri(IdentityTestFixture.MailerBaseAddress, "api/v2/emails"));
		capturedRequest.Headers.Authorization.ShouldNotBeNull();
		capturedRequest.Headers.Authorization!.Scheme.ShouldBe("Bearer");
		capturedRequest.Headers.Authorization.Parameter.ShouldBe("test-api-key");

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
			_mailSender.SendAsync(_message, TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "181UC2")]
	public async Task SendAsync_MailerooReturnsNon2xxStatus_ThrowsRatherThanSucceeding()
	{
		SetupResponse(HttpStatusCode.BadRequest, """{"success":false,"message":"bad request"}""");

		await Should.ThrowAsync<InvalidOperationException>(() =>
			_mailSender.SendAsync(_message, TestContext.Current.CancellationToken));
	}

	private void SetupResponse(HttpStatusCode statusCode, string content)
	{
		_context.Services.HttpMessageHandlerMock.Protected()
			.Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
			.ReturnsAsync(new HttpResponseMessage(statusCode) { Content = new StringContent(content) });
	}
}