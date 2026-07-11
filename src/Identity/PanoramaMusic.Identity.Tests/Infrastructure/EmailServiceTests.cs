using Microsoft.Extensions.Options;
using Moq;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Infrastructure.Configurations;
using PanoramaMusic.Identity.Infrastructure.Services;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class EmailServiceTests
{
	[Fact]
	[Trait("AC", "181UC3")]
	public async Task SendPasswordResetAsync_BuildsEmailMessageAndDelegatesToMailSender()
	{
		var mailSenderMock = new Mock<IMailSender>();
		EmailMessage? capturedMessage = null;
		mailSenderMock
			.Setup(m => m.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
			.Callback<EmailMessage, CancellationToken>((message, _) => capturedMessage = message)
			.Returns(Task.CompletedTask);

		var options = Options.Create(new EmailOptions
		{
			From = "noreply@panorama-music.com",
			ReplyTo = "noreply@panorama-music.com",
			FromDisplayName = "Panorama Music",
		});

		var appOptionsMock = new Mock<IAppOptions>();
		appOptionsMock.SetupGet(a => a.AppBaseUrl).Returns("https://panorama-music.example");

		var emailService = new EmailService(mailSenderMock.Object, options, appOptionsMock.Object);

		await emailService.SendPasswordResetAsync("user@example.com", "raw-token", TestContext.Current.CancellationToken);

		capturedMessage.ShouldNotBeNull();
		capturedMessage!.To.ShouldBe("user@example.com");
		capturedMessage.From.ShouldBe("noreply@panorama-music.com");
		capturedMessage.ReplyTo.ShouldBe("noreply@panorama-music.com");
		capturedMessage.FromDisplayName.ShouldBe("Panorama Music");
		capturedMessage.Subject.ShouldBe("Reset your Panorama Music password");
		capturedMessage.Html.ShouldContain("https://panorama-music.example/#/reset-password?token=raw-token");
		capturedMessage.Html.ShouldContain($"{TokenConstants.PasswordResetTokenExpiryHours} hour(s)");
		mailSenderMock.Verify(m => m.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()), Times.Once);
	}
}