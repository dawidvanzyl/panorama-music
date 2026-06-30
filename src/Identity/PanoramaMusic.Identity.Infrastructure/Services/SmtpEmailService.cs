using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using MimeKit;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Configurations;

namespace PanoramaMusic.Identity.Infrastructure.Services;

public sealed class SmtpEmailService(IOptions<SmtpOptions> options, IAppOptions appOptions, IHostEnvironment hostEnvironment) : IEmailService
{
	private readonly SmtpOptions _options = options.Value;

	public async Task SendPasswordResetAsync(string to, string rawToken, CancellationToken cancellationToken)
	{
		var resetLink = $"{appOptions.AppBaseUrl}/#/reset-password?token={rawToken}";
		var message = new MimeMessage();
		message.From.Add(new MailboxAddress(_options.FromDisplayName, _options.From));
		message.To.Add(MailboxAddress.Parse(to));
		message.Subject = "Reset your Panorama Music password";
		message.Body = new TextPart("html")
		{
			Text = $"""
				<p>Hello,</p>
				<p>We received a request to reset your Panorama Music password.</p>
				<p>Click the link below to set a new password. This link expires in {TokenConstants.PasswordResetTokenExpiryHours} hour(s).</p>
				<p><a href="{resetLink}">{resetLink}</a></p>
				<p>If you did not request a password reset, you can safely ignore this email.</p>
				""",
		};

		using var client = new SmtpClient();
		await client.ConnectAsync(_options.Host, _options.Port, ResolveSecureSocketOptions(hostEnvironment), cancellationToken);
		if (!string.IsNullOrEmpty(_options.Username))
			await client.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);
		await client.SendAsync(message, cancellationToken);
		await client.DisconnectAsync(quit: true, cancellationToken);
	}

	// Development and QA both run against a local docker mail catcher (smtp4dev)
	// that isn't configured for TLS, so opportunistic STARTTLS is used there.
	// Production must refuse to send over an unencrypted connection rather than
	// silently falling back to plaintext.
	public static SecureSocketOptions ResolveSecureSocketOptions(IHostEnvironment hostEnvironment) =>
		hostEnvironment.IsProduction()
			? SecureSocketOptions.StartTls
			: SecureSocketOptions.StartTlsWhenAvailable;
}