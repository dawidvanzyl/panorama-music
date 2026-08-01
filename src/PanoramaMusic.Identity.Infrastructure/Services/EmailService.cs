using Microsoft.Extensions.Options;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Infrastructure.Configurations;

namespace PanoramaMusic.Identity.Infrastructure.Services;

/// <summary>
/// Composes outbound mail and hands it to the configured transport. This is the single
/// composition point for the SMTP/IMAP injection rule (ASVS 5.0.0-1.3.11): the subject and
/// body are fixed literals, the from/reply-to addresses come from operator configuration,
/// and header encoding is delegated to the transport rather than done by string
/// concatenation here.
/// <para>
/// The recipient is the one field this type cannot vouch for itself — <c>to</c> is a bare
/// <c>string</c>, so the guarantee that it is a validated address rests on callers passing
/// the value of an <c>Email</c> value object rather than on anything enforced at this
/// boundary. Keep it that way, and prefer tightening the parameter type over relying on the
/// convention. Re-verify this rule if a user-supplied display name or subject line is ever
/// introduced.
/// </para>
/// </summary>
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