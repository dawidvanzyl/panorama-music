using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Dtos;

namespace PanoramaMusic.Identity.Infrastructure.Extensions;

internal static class UserDtoExtensions
{
	internal static User MapToUser(this UserDto dto)
	{
		var user = new User(dto.User_Id, Email.Create(dto.Email), dto.Created_At);

		if (dto.Password_Hash is not null)
			user.SetPassword(PasswordHash.Create(dto.Password_Hash));

		if (dto.Is_Active)
			user.Activate();

		return user;
	}
}