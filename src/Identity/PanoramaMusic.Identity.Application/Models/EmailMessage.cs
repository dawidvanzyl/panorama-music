namespace PanoramaMusic.Identity.Application.Models;

public sealed record EmailMessage(string To, string From, string ReplyTo, string FromDisplayName, string Subject, string Html);