using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Tests;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Infrastructure.Tests;

public class CommonPasswordServiceTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly ICommonPasswordService _commonPasswordService;

	public CommonPasswordServiceTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_commonPasswordService = _context.ServiceProvider.GetRequiredService<ICommonPasswordService>();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_DenyListFlagsPassword_ReturnsFalseWithoutCallingHibp()
	{
		_context.Services.DenyListPasswordServiceMock.Setup(d => d.Validate("password123")).Returns(false);

		var result = await _commonPasswordService.ValidateAsync("password123", TestContext.Current.CancellationToken);

		result.ShouldBeFalse();
		_context.Services.HibpPasswordServiceMock.Verify(h => h.ValidateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never());
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_DenyListPassesAndHibpSaysNotBreached_ReturnsTrue()
	{
		_context.Services.DenyListPasswordServiceMock.Setup(d => d.Validate("xK9$qzL2!mPvR7nE")).Returns(true);
		_context.Services.HibpPasswordServiceMock.Setup(h => h.ValidateAsync("xK9$qzL2!mPvR7nE", It.IsAny<CancellationToken>())).ReturnsAsync(true);

		var result = await _commonPasswordService.ValidateAsync("xK9$qzL2!mPvR7nE", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_DenyListPassesAndHibpSaysBreached_ReturnsFalse()
	{
		_context.Services.DenyListPasswordServiceMock.Setup(d => d.Validate("breached-but-uncommon")).Returns(true);
		_context.Services.HibpPasswordServiceMock.Setup(h => h.ValidateAsync("breached-but-uncommon", It.IsAny<CancellationToken>())).ReturnsAsync(false);

		var result = await _commonPasswordService.ValidateAsync("breached-but-uncommon", TestContext.Current.CancellationToken);

		result.ShouldBeFalse();
	}
}