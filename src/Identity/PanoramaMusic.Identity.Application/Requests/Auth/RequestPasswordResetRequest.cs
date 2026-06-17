using System.ComponentModel.DataAnnotations;

namespace PanoramaMusic.Identity.Application.Requests.Auth;

public record RequestPasswordResetRequest([EmailAddress] string Email);