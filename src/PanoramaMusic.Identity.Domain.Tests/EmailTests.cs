using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Domain.Tests;

public class EmailTests
{
	[Fact]
	[Trait("AC", "M1UC1")]
	public void Create_EmptyString_ThrowsDomainException()
	{
		Should.Throw<DomainException>(() => Email.Create(string.Empty));
	}

	[Fact]
	[Trait("AC", "M1UC2")]
	public void Create_NoAtSign_ThrowsDomainException()
	{
		Should.Throw<DomainException>(() => Email.Create("invalidemail.com"));
	}

	[Fact]
	[Trait("AC", "M1UC3")]
	public void Create_ValidEmail_NormalisesToLowercase()
	{
		var email = Email.Create(" Example@Test.Com ");

		email.Value.ShouldBe("example@test.com");
	}
}