using System.Data;
using Moq;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Infrastructure.Adapter;
using PanoramaMusic.Identity.Infrastructure.Entities;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class RefreshTokenRepositoryTests
{
    private static (Mock<IDapperWrapper> dapper, RefreshTokenRepository repo) CreateSut()
    {
        var mockConnection = new Mock<IDbConnection>();
        var mockTransaction = new Mock<IDbTransaction>();
        mockConnection.Setup(c => c.BeginTransaction()).Returns(mockTransaction.Object);
        mockConnection.Setup(c => c.BeginTransaction(It.IsAny<IsolationLevel>())).Returns(mockTransaction.Object);

        var mockDapper = new Mock<IDapperWrapper>();
        mockDapper.Setup(d => d.CreateConnection()).Returns(mockConnection.Object);
        mockDapper
            .Setup(d => d.ExecuteAsync(
                It.IsAny<IDbConnection>(), It.IsAny<string>(),
                It.IsAny<object?>(), It.IsAny<CommandType>(), It.IsAny<IDbTransaction?>()))
            .Returns(Task.CompletedTask);

        return (mockDapper, new RefreshTokenRepository(mockDapper.Object));
    }

    [Fact]
    [Trait("AC", "M1UC15")]
    public async Task GetByTokenHashAsync_UsesCorrectFunctionAndParameters()
    {
        var (mockDapper, repo) = CreateSut();
        const string tokenHash = "refreshhash456";

        mockDapper
            .Setup(d => d.QuerySingleOrDefaultAsync<RefreshTokenRow>(
                It.IsAny<IDbConnection>(), "identity.get_refresh_token_by_hash",
                It.IsAny<object?>(), CommandType.StoredProcedure, null))
            .ReturnsAsync((RefreshTokenRow?)null);

        await repo.GetByTokenHashAsync(tokenHash);

        mockDapper.Verify(d => d.QuerySingleOrDefaultAsync<RefreshTokenRow>(
            It.IsAny<IDbConnection>(),
            "identity.get_refresh_token_by_hash",
            It.Is<object>(p => (string)p.GetType().GetProperty("p_token_hash")!.GetValue(p)! == tokenHash),
            CommandType.StoredProcedure,
            null), Times.Once);
    }

    [Fact]
    public async Task AddAsync_UsesCorrectFunctionAndParameters()
    {
        var (mockDapper, repo) = CreateSut();
        var token = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "somehash", DateTime.UtcNow.AddHours(1));

        await repo.AddAsync(token);

        mockDapper.Verify(d => d.ExecuteAsync(
            It.IsAny<IDbConnection>(),
            "identity.create_refresh_token",
            It.Is<object>(p => (Guid)p.GetType().GetProperty("p_token_id")!.GetValue(p)! == token.TokenId),
            CommandType.StoredProcedure,
            It.IsAny<IDbTransaction?>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_UsesCorrectFunctionAndParameters()
    {
        var (mockDapper, repo) = CreateSut();
        var token = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "somehash", DateTime.UtcNow.AddHours(1));

        await repo.UpdateAsync(token);

        mockDapper.Verify(d => d.ExecuteAsync(
            It.IsAny<IDbConnection>(),
            "identity.revoke_refresh_token",
            It.Is<object>(p => (Guid)p.GetType().GetProperty("p_token_id")!.GetValue(p)! == token.TokenId),
            CommandType.StoredProcedure,
            It.IsAny<IDbTransaction?>()), Times.Once);
    }

    [Fact]
    [Trait("AC", "M1UC35")]
    public async Task RotateAsync_RevokesOldAndCreatesNewInSameTransaction()
    {
        var (mockDapper, repo) = CreateSut();
        var oldTokenId = Guid.NewGuid();
        var newToken = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "newhash", DateTime.UtcNow.AddHours(1));

        await repo.RotateAsync(oldTokenId, newToken);

        mockDapper.Verify(d => d.ExecuteAsync(
            It.IsAny<IDbConnection>(),
            "identity.revoke_refresh_token",
            It.Is<object>(p => (Guid)p.GetType().GetProperty("p_token_id")!.GetValue(p)! == oldTokenId),
            CommandType.StoredProcedure,
            It.IsNotNull<IDbTransaction>()), Times.Once);

        mockDapper.Verify(d => d.ExecuteAsync(
            It.IsAny<IDbConnection>(),
            "identity.create_refresh_token",
            It.Is<object>(p =>
                (Guid)p.GetType().GetProperty("p_token_id")!.GetValue(p)! == newToken.TokenId &&
                (Guid)p.GetType().GetProperty("p_user_id")!.GetValue(p)! == newToken.UserId &&
                (string)p.GetType().GetProperty("p_token_hash")!.GetValue(p)! == newToken.TokenHash),
            CommandType.StoredProcedure,
            It.IsNotNull<IDbTransaction>()), Times.Once);
    }
}
