using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Identity.Application.Commands.Auth;

public record ResetPasswordCommand(ResetPasswordRequest Request);