using Microsoft.Extensions.DependencyInjection;
using Moq;
using Moq.Protected;
using PanoramaMusic.Identity.Infrastructure.Services;
using PanoramaMusic.Identity.Tests;
using Shouldly;
using System.Net;
using Xunit;

namespace PanoramaMusic.Identity.Infrastructure.Tests;

public class HibpPasswordServiceTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly IHibpPasswordService _service;

	public HibpPasswordServiceTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_service = _context.ServiceProvider.GetRequiredService<IHibpPasswordService>();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_NoMatchingSuffixInResponse_ReturnsTrue()
	{
		SetupResponse(HttpStatusCode.OK, "0000000000000000000000000000000000:5\n");

		var result = await _service.ValidateAsync("xK9$qzL2!mPvR7nE", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_MatchingSuffixInResponse_ReturnsFalse()
	{
		// SHA1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8 (verified via openssl)
		// prefix = 5BAA6, suffix = 1E4C9B93F3F0682250B6CF8331B7EE68FD8
		SetupResponse(HttpStatusCode.OK, "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\n");

		var result = await _service.ValidateAsync("password", TestContext.Current.CancellationToken);

		result.ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_HttpRequestThrows_FailsOpenAndReturnsTrue()
	{
		SetupThrows(new HttpRequestException("network down"));

		var result = await _service.ValidateAsync("anything", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_RequestTimesOut_FailsOpenAndReturnsTrue()
	{
		SetupThrows(new TaskCanceledException("timed out"));

		var result = await _service.ValidateAsync("anything", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task ValidateAsync_DisabledViaOptions_ReturnsTrueWithoutCallingHttp()
	{
		_context.Options.HibpOptions.Enabled = false;

		var result = await _service.ValidateAsync("password", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
		_context.Services.HttpMessageHandlerMock.Protected().Verify("SendAsync", Times.Never(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
	}

	private void SetupResponse(HttpStatusCode statusCode, string content)
	{
		_context.Services.HttpMessageHandlerMock.Protected()
			.Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
			.ReturnsAsync(new HttpResponseMessage(statusCode) { Content = new StringContent(content) });
	}

	private void SetupThrows(Exception exception)
	{
		_context.Services.HttpMessageHandlerMock.Protected()
			.Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
			.ThrowsAsync(exception);
	}
}