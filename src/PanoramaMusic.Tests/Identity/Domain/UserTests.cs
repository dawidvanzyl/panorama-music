using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Domain;

public class UserTests
{
    [Fact]
    [Trait("AC", "M1UC6")]
    public void Created_PasswordHashIsNullAndIsActiveFalse()
    {
        var email = Email.Create("user@example.com");
        var user = new User(Guid.NewGuid(), email, DateTime.UtcNow);

        user.PasswordHash.ShouldBeNull();
        user.IsActive.ShouldBeFalse();
    }
}
