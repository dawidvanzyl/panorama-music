using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Infrastructure.Configurations;

namespace PanoramaMusic.Identity.Infrastructure.Services;

public sealed class SmtpEmailSender(IOptions<SmtpOptions> options) : IEmailSender
{
	private readonly SmtpOptions _options = options.Value;

	public async Task SendPasswordResetAsync(string to, string rawToken, CancellationToken cancellationToken)
	{
		var resetLink = $"{_options.AppBaseUrl}/#/reset-password?token={rawToken}";

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
		await client.ConnectAsync(_options.Host, _options.Port, SecureSocketOptions.StartTls, cancellationToken);
		await client.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);
		await client.SendAsync(message, cancellationToken);
		await client.DisconnectAsync(quit: true, cancellationToken);
	}
}