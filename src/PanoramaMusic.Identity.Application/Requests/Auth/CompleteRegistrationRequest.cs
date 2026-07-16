namespace PanoramaMusic.Identity.Application.Requests.Auth;

public sealed record CompleteRegistrationRequest(string InviteToken, string NewPassword);