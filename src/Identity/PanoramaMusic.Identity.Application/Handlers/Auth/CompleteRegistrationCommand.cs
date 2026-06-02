namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed record CompleteRegistrationRequest(string InviteToken, string NewPassword);

public sealed record CompleteRegistrationCommand(CompleteRegistrationRequest Request);
