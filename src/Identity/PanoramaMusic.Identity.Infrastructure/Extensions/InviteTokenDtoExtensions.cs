using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Infrastructure.Dtos;

namespace PanoramaMusic.Identity.Infrastructure.Extensions;

internal static class InviteTokenDtoExtensions
{
	internal static InviteToken MapToInviteToken(this InviteTokenDto dto)
	{
		return new InviteToken(
			dto.Token_Id,
			dto.User_Id,
			dto.Token_Hash,
			dto.Expires_At,
			dto.Used_At);
	}
}