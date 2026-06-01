using PanoramaMusic.Identity.Domain.Common;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Domain;

public class IdentityDomainTests
{
    // M1UC1 — Email.Create throws on empty string
    [Fact]
    [Trait("AC", "M1UC1")]
    public void Email_Create_EmptyString_ThrowsDomainException()
    {
        Should.Throw<DomainException>(() => Email.Create(string.Empty));
    }

    // M1UC2 — Email.Create throws when no '@'
    [Fact]
    [Trait("AC", "M1UC2")]
    public void Email_Create_NoAtSign_ThrowsDomainException()
    {
        Should.Throw<DomainException>(() => Email.Create("invalidemail.com"));
    }

    // M1UC3 — Email.Create trims and lowercases
    [Fact]
    [Trait("AC", "M1UC3")]
    public void Email_Create_ValidEmail_NormalisesToLowercase()
    {
        var email = Email.Create(" Example@Test.Com ");
        email.Value.ShouldBe("example@test.com");
    }

    // M1UC4 — PasswordHash.Create throws on empty hash
    [Fact]
    [Trait("AC", "M1UC4")]
    public void PasswordHash_Create_EmptyHash_ThrowsDomainException()
    {
        Should.Throw<DomainException>(() => PasswordHash.Create(string.Empty));
    }

    // M1UC5 — PasswordHash.Create stores value correctly
    [Fact]
    [Trait("AC", "M1UC5")]
    public void PasswordHash_Create_ValidHash_StoresValue()
    {
        var hash = PasswordHash.Create("hashedvalue123");
        hash.Value.ShouldBe("hashedvalue123");
    }

    // M1UC6 — new User has null PasswordHash and IsActive false
    [Fact]
    [Trait("AC", "M1UC6")]
    public void User_Created_PasswordHashIsNullAndIsActiveFalse()
    {
        var email = Email.Create("user@example.com");
        var user = new User(Guid.NewGuid(), email, DateTime.UtcNow);

        user.PasswordHash.ShouldBeNull();
        user.IsActive.ShouldBeFalse();
    }

    // M1UC7 — RefreshToken with ExpiresAt in the past, IsExpired is true
    [Fact]
    [Trait("AC", "M1UC7")]
    public void RefreshToken_IsExpired_WhenExpiresAtInPast_ReturnsTrue()
    {
        var token = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddMinutes(-1));
        token.IsExpired.ShouldBeTrue();
    }

    // M1UC8 — RefreshToken with RevokedAt set, IsRevoked is true
    [Fact]
    [Trait("AC", "M1UC8")]
    public void RefreshToken_IsRevoked_WhenRevokedAtSet_ReturnsTrue()
    {
        var token = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddHours(1));
        token.Revoke();
        token.IsRevoked.ShouldBeTrue();
    }

    // M1UC9 — InviteToken expired, MarkUsed throws
    [Fact]
    [Trait("AC", "M1UC9")]
    public void InviteToken_MarkUsed_WhenExpired_ThrowsDomainException()
    {
        var token = new InviteToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddMinutes(-1));
        Should.Throw<DomainException>(() => token.MarkUsed());
    }

    // M1UC10 — InviteToken already used, MarkUsed throws
    [Fact]
    [Trait("AC", "M1UC10")]
    public void InviteToken_MarkUsed_WhenAlreadyUsed_ThrowsDomainException()
    {
        var token = new InviteToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddHours(1));
        token.MarkUsed();
        Should.Throw<DomainException>(() => token.MarkUsed());
    }
}
