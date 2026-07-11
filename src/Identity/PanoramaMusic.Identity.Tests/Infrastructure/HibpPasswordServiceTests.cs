using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using System.Net;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Infrastructure;

public class HibpPasswordServiceTests
{
	private readonly Mock<HttpMessageHandler> _handler = new();
	private readonly HibpPasswordService _hibpPasswordService;

	public HibpPasswordServiceTests()
	{
		var httpClient = new HttpClient(_handler.Object) { BaseAddress = new Uri("https://api.pwnedpasswords.com/") };
		_hibpPasswordService = new HibpPasswordService(
			httpClient,
			Options.Create(new HibpOptions { Enabled = true }),
			Mock.Of<ILogger<HibpPasswordService>>());
	}

	private void SetupResponse(HttpStatusCode statusCode, string content)
	{
		_handler.Protected()
			.Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
			.ReturnsAsync(new HttpResponseMessage(statusCode) { Content = new StringContent(content) });
	}

	private void SetupThrows(Exception exception)
	{
		_handler.Protected()
			.Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
			.ThrowsAsync(exception);
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_NoMatchingSuffixInResponse_ReturnsTrue()
	{
		SetupResponse(HttpStatusCode.OK, "0000000000000000000000000000000000:5\n");

		var result = await _hibpPasswordService.ValidateAsync("xK9$qzL2!mPvR7nE", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_MatchingSuffixInResponse_ReturnsFalse()
	{
		// SHA1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8 (verified via openssl)
		// prefix = 5BAA6, suffix = 1E4C9B93F3F0682250B6CF8331B7EE68FD8
		SetupResponse(HttpStatusCode.OK, "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\n");

		var result = await _hibpPasswordService.ValidateAsync("password", TestContext.Current.CancellationToken);

		result.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_HttpRequestThrows_FailsOpenAndReturnsTrue()
	{
		SetupThrows(new HttpRequestException("network down"));

		var result = await _hibpPasswordService.ValidateAsync("anything", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_RequestTimesOut_FailsOpenAndReturnsTrue()
	{
		SetupThrows(new TaskCanceledException("timed out"));

		var result = await _hibpPasswordService.ValidateAsync("anything", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_DisabledViaOptions_ReturnsTrueWithoutCallingHttp()
	{
		var httpClient = new HttpClient(_handler.Object) { BaseAddress = new Uri("https://api.pwnedpasswords.com/") };
		var disabledService = new HibpPasswordService(
			httpClient,
			Options.Create(new HibpOptions { Enabled = false }),
			Mock.Of<ILogger<HibpPasswordService>>());

		var result = await disabledService.ValidateAsync("password", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
		_handler.Protected().Verify("SendAsync", Times.Never(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
	}
}