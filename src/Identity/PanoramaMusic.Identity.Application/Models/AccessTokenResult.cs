namespace PanoramaMusic.Identity.Application.Models;

public sealed record AccessTokenResult(string AccessToken, DateTime AccessTokenExpiresAt);