using Microsoft.Extensions.Options;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Infrastructure.Configurations;

namespace PanoramaMusic.Identity.Infrastructure.Services;

public sealed class EmailService(IMailSender mailSender, IOptions<EmailOptions> options, IAppOptions appOptions) : IEmailService
{
	private readonly EmailOptions _options = options.Value;

	public Task SendPasswordResetAsync(string to, string rawToken, CancellationToken cancellationToken)
	{
		var resetLink = $"{appOptions.AppBaseUrl}/#/reset-password?token={rawToken}";
		var message = new EmailMessage(
			to,
			_options.From,
			_options.ReplyTo,
			_options.FromDisplayName,
			"Reset your Panorama Music password",
			$"""
				<p>Hello,</p>
				<p>We received a request to reset your Panorama Music password.</p>
				<p>Click the link below to set a new password. This link expires in {TokenConstants.PasswordResetTokenExpiryHours} hour(s).</p>
				<p><a href="{resetLink}">{resetLink}</a></p>
				<p>If you did not request a password reset, you can safely ignore this email.</p>
				""");

		return mailSender.SendAsync(message, cancellationToken);
	}
}