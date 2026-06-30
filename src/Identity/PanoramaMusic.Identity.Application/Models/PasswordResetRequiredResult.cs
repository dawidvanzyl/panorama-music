namespace PanoramaMusic.Identity.Application.Models;

public sealed record PasswordResetRequiredResult(bool PasswordResetRequired, string ResetToken);