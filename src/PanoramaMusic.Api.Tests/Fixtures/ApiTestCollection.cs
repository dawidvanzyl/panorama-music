using Xunit;

namespace PanoramaMusic.Api.Tests.Fixtures;

/// <summary>
/// Shares a single <see cref="ApiTestFixture"/> (one host, one Postgres container) across
/// all API test classes. Each class previously declared its own <c>IClassFixture</c>, which
/// raced on the process-wide environment variables ApiTestFixture sets when fixtures for
/// different classes started concurrently.
/// </summary>
[CollectionDefinition(Name)]
public sealed class ApiTestCollection : ICollectionFixture<ApiTestFixture>
{
	public const string Name = "Api";
}