using MailKit.Security;
using Microsoft.Extensions.Hosting;
using Moq;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class SmtpEmailServiceTests
{
	private static IHostEnvironment CreateHostEnvironment(string environmentName)
	{
		var mockHostEnvironment = new Mock<IHostEnvironment>();
		mockHostEnvironment.SetupGet(e => e.EnvironmentName).Returns(environmentName);
		return mockHostEnvironment.Object;
	}

	[Fact]
	[Trait("AC", "M1.4UC11")]
	public void ResolveSecureSocketOptions_InProduction_RequiresMandatoryStartTls()
	{
		var environment = CreateHostEnvironment(Environments.Production);

		var result = SmtpEmailService.ResolveSecureSocketOptions(environment);

		result.ShouldBe(SecureSocketOptions.StartTls);
	}

	[Theory]
	[InlineData("Development")]
	[InlineData("QA")]
	[Trait("AC", "M1.4UC11")]
	public void ResolveSecureSocketOptions_InDevelopmentOrQa_AllowsOpportunisticStartTls(string environmentName)
	{
		var environment = CreateHostEnvironment(environmentName);

		var result = SmtpEmailService.ResolveSecureSocketOptions(environment);

		result.ShouldBe(SecureSocketOptions.StartTlsWhenAvailable);
	}
}