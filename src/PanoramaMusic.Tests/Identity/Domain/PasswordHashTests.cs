using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Domain;

public class PasswordHashTests
{
    [Fact]
    [Trait("AC", "M1UC4")]
    public void Create_EmptyHash_ThrowsDomainException()
    {
        Should.Throw<DomainException>(() => PasswordHash.Create(string.Empty));
    }

    [Fact]
    [Trait("AC", "M1UC5")]
    public void Create_ValidHash_StoresValue()
    {
        var hash = PasswordHash.Create("hashedvalue123");

        hash.Value.ShouldBe("hashedvalue123");
    }
}
