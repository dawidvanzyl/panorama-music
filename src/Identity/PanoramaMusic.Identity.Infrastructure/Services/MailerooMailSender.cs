using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace PanoramaMusic.Identity.Infrastructure.Services;

public sealed class MailerooMailSender(HttpClient httpClient) : IMailSender
{
	public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
	{
		var payload = new MailerooRequest(
			new MailerooAddress(message.From, message.FromDisplayName),
			[new MailerooAddress(message.To, null)],
			new MailerooAddress(message.ReplyTo, message.FromDisplayName),
			message.Subject,
			message.Html);

		using var response = await httpClient.PostAsJsonAsync("api/v2/emails", payload, cancellationToken);
		var body = await response.Content.ReadFromJsonAsync<MailerooResponse>(cancellationToken);

		if (!response.IsSuccessStatusCode || body is null || !body.Success)
			throw new InvalidOperationException($"Maileroo email send failed: {body?.Message ?? response.ReasonPhrase}");
	}

	private sealed record MailerooRequest(
		[property: JsonPropertyName("from")] MailerooAddress From,
		[property: JsonPropertyName("to")] MailerooAddress[] To,
		[property: JsonPropertyName("reply_to")] MailerooAddress ReplyTo,
		[property: JsonPropertyName("subject")] string Subject,
		[property: JsonPropertyName("html")] string Html);

	private sealed record MailerooAddress(
		[property: JsonPropertyName("address")] string Address,
		[property: JsonPropertyName("display_name")] string? DisplayName);

	private sealed record MailerooResponse(
		[property: JsonPropertyName("success")] bool Success,
		[property: JsonPropertyName("message")] string? Message);
}