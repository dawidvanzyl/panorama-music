using Moq;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Infrastructure;

public class CommonPasswordServiceTests
{
	private readonly Mock<IDenyListPasswordService> _denyListPasswordService = new();
	private readonly Mock<IHibpPasswordService> _hibpPasswordService = new();
	private readonly CommonPasswordService _commonPasswordService;

	public CommonPasswordServiceTests()
	{
		_commonPasswordService = new CommonPasswordService(_denyListPasswordService.Object, _hibpPasswordService.Object);
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_DenyListFlagsPassword_ReturnsFalseWithoutCallingHibp()
	{
		_denyListPasswordService.Setup(d => d.Validate("password123")).Returns(false);

		var result = await _commonPasswordService.ValidateAsync("password123", TestContext.Current.CancellationToken);

		result.ShouldBeFalse();
		_hibpPasswordService.Verify(h => h.ValidateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never());
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_DenyListPassesAndHibpSaysNotBreached_ReturnsTrue()
	{
		_denyListPasswordService.Setup(d => d.Validate("xK9$qzL2!mPvR7nE")).Returns(true);
		_hibpPasswordService.Setup(h => h.ValidateAsync("xK9$qzL2!mPvR7nE", It.IsAny<CancellationToken>())).ReturnsAsync(true);

		var result = await _commonPasswordService.ValidateAsync("xK9$qzL2!mPvR7nE", TestContext.Current.CancellationToken);

		result.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task ValidateAsync_DenyListPassesAndHibpSaysBreached_ReturnsFalse()
	{
		_denyListPasswordService.Setup(d => d.Validate("breached-but-uncommon")).Returns(true);
		_hibpPasswordService.Setup(h => h.ValidateAsync("breached-but-uncommon", It.IsAny<CancellationToken>())).ReturnsAsync(false);

		var result = await _commonPasswordService.ValidateAsync("breached-but-uncommon", TestContext.Current.CancellationToken);

		result.ShouldBeFalse();
	}
}