using Shouldly;
using Xunit;

namespace PanoramaMusic.Tests;

public class SmokeTests
{
    [Fact]
    public void TestRunner_ShouldBeConfiguredCorrectly()
    {
        // Arrange
        var expected = true;

        // Act
        var actual = true;

        // Assert
        actual.ShouldBe(expected);
    }
}
