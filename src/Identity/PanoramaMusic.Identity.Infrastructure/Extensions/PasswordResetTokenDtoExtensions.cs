using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Infrastructure.Dtos;

namespace PanoramaMusic.Identity.Infrastructure.Extensions;

internal static class PasswordResetTokenDtoExtensions
{
	internal static PasswordResetToken MapToPasswordResetToken(this PasswordResetTokenDto dto)
	{
		return new PasswordResetToken(
			dto.Token_Id,
			dto.User_Id,
			dto.Token_Hash,
			dto.Expires_At);
	}
}