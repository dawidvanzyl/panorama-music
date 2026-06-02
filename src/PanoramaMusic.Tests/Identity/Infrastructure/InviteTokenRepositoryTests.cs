using System.Data;
using Moq;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Infrastructure.Data;
using PanoramaMusic.Identity.Infrastructure.Entities;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class InviteTokenRepositoryTests
{
    private static (Mock<IDbConnectionFactory> factory, Mock<IDapperWrapper> dapper, InviteTokenRepository repo) CreateSut()
    {
        var mockFactory = new Mock<IDbConnectionFactory>();
        var mockConnection = new Mock<IDbConnection>();
        mockFactory.Setup(f => f.CreateConnection()).Returns(mockConnection.Object);

        var mockDapper = new Mock<IDapperWrapper>();
        mockDapper
            .Setup(d => d.ExecuteAsync(
                It.IsAny<IDbConnection>(), It.IsAny<string>(),
                It.IsAny<object?>(), It.IsAny<CommandType>(), It.IsAny<IDbTransaction?>()))
            .Returns(Task.CompletedTask);

        return (mockFactory, mockDapper, new InviteTokenRepository(mockFactory.Object, mockDapper.Object));
    }

    [Fact]
    [Trait("AC", "M1UC14")]
    public async Task GetByTokenHashAsync_UsesCorrectFunctionAndParameters()
    {
        var (_, mockDapper, repo) = CreateSut();
        const string tokenHash = "abc123hash";

        mockDapper
            .Setup(d => d.QuerySingleOrDefaultAsync<InviteTokenRow>(
                It.IsAny<IDbConnection>(), "identity.get_invite_token_by_hash",
                It.IsAny<object?>(), CommandType.StoredProcedure, null))
            .ReturnsAsync((InviteTokenRow?)null);

        await repo.GetByTokenHashAsync(tokenHash);

        mockDapper.Verify(d => d.QuerySingleOrDefaultAsync<InviteTokenRow>(
            It.IsAny<IDbConnection>(),
            "identity.get_invite_token_by_hash",
            It.Is<object>(p => (string)p.GetType().GetProperty("p_token_hash")!.GetValue(p)! == tokenHash),
            CommandType.StoredProcedure,
            null), Times.Once);
    }

    [Fact]
    public async Task AddAsync_UsesCorrectFunctionAndParameters()
    {
        var (_, mockDapper, repo) = CreateSut();
        var token = new InviteToken(Guid.NewGuid(), Guid.NewGuid(), "somehash", DateTime.UtcNow.AddHours(1));

        await repo.AddAsync(token);

        mockDapper.Verify(d => d.ExecuteAsync(
            It.IsAny<IDbConnection>(),
            "identity.create_invite_token",
            It.Is<object>(p => (Guid)p.GetType().GetProperty("p_token_id")!.GetValue(p)! == token.TokenId),
            CommandType.StoredProcedure,
            It.IsAny<IDbTransaction?>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_UsesCorrectFunctionAndParameters()
    {
        var (_, mockDapper, repo) = CreateSut();
        var token = new InviteToken(Guid.NewGuid(), Guid.NewGuid(), "somehash", DateTime.UtcNow.AddHours(1));

        await repo.UpdateAsync(token);

        mockDapper.Verify(d => d.ExecuteAsync(
            It.IsAny<IDbConnection>(),
            "identity.use_invite_token",
            It.Is<object>(p => (Guid)p.GetType().GetProperty("p_token_id")!.GetValue(p)! == token.TokenId),
            CommandType.StoredProcedure,
            It.IsAny<IDbTransaction?>()), Times.Once);
    }
}
