using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Infrastructure.Dtos;

namespace PanoramaMusic.Identity.Infrastructure.Extensions;

internal static class RefreshTokenDtoExtensions
{
	internal static RefreshToken MapToRefreshToken(this RefreshTokenDto dto)
	{
		var token = new RefreshToken(
			dto.Token_Id,
			dto.User_Id,
			dto.Token_Hash,
			dto.Expires_At,
			dto.Family_Id,
			dto.Session_Started_At,
			dto.Device_Label,
			dto.Ip_Address);

		token.Touch(dto.Last_Seen_At);

		if (dto.Revoked_At.HasValue)
			token.Revoke(dto.Revoked_At.Value);

		return token;
	}
}