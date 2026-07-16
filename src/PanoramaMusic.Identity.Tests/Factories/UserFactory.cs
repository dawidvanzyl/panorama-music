using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Tests.Factories;

public static class UserFactory
{
	public static User CreateActive(Guid userId, string email = "u@test.com", string passwordHashValue = "$argon2id$v=19$valid")
	{
		var user = Create(userId, email, passwordHashValue);
		user.Activate();
		return user;
	}

	public static User Create(Guid userId, string email = "u@test.com", string passwordHashValue = "$argon2id$v=19$valid")
	{
		var user = new User(userId, Email.Create(email), DateTime.UtcNow);
		user.SetPassword(PasswordHash.Create(passwordHashValue));
		return user;
	}
}