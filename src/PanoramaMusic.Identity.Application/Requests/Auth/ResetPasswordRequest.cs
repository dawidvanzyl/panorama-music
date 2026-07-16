namespace PanoramaMusic.Identity.Application.Requests.Auth;

public record ResetPasswordRequest(string Token, string NewPassword);