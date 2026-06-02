using Moq;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Data;
using PanoramaMusic.Identity.Infrastructure.Entities;
using PanoramaMusic.Identity.Infrastructure.Repositories;
using System.Data;
using Xunit;

namespace PanoramaMusic.Tests.Identity.Infrastructure;

public class UserRepositoryTests
{
    private static (Mock<IDapperWrapper> dapper, UserRepository repo) CreateSut()
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

        return (mockDapper, new UserRepository(mockDapper.Object));
    }

    [Fact]
    [Trait("AC", "M1UC11")]
    public async Task GetByIdAsync_UsesCorrectFunctionAndParameters()
    {
        var (mockDapper, repo) = CreateSut();
        var userId = Guid.NewGuid();

        mockDapper
            .Setup(d => d.QuerySingleOrDefaultAsync<UserRow>(
                It.IsAny<IDbConnection>(), "identity.get_user_by_id",
                It.IsAny<object?>(), CommandType.StoredProcedure, null))
            .ReturnsAsync((UserRow?)null);

        await repo.GetByIdAsync(userId);

        mockDapper.Verify(d => d.QuerySingleOrDefaultAsync<UserRow>(
            It.IsAny<IDbConnection>(),
            "identity.get_user_by_id",
            It.Is<object>(p => (Guid)p.GetType().GetProperty("p_user_id")!.GetValue(p)! == userId),
            CommandType.StoredProcedure,
            null), Times.Once);
    }

    [Fact]
    [Trait("AC", "M1UC12")]
    public async Task AddAsync_UsesCorrectFunctionAndParameters()
    {
        var (mockDapper, repo) = CreateSut();
        var userId = Guid.NewGuid();
        var user = new User(userId, Email.Create("test@example.com"), DateTime.UtcNow);

        await repo.AddAsync(user);

        mockDapper.Verify(d => d.ExecuteAsync(
            It.IsAny<IDbConnection>(),
            "identity.create_user",
            It.Is<object>(p =>
                (Guid)p.GetType().GetProperty("p_user_id")!.GetValue(p)! == userId &&
                (string)p.GetType().GetProperty("p_email")!.GetValue(p)! == "test@example.com" &&
                (bool)p.GetType().GetProperty("p_is_active")!.GetValue(p)! == false),
            CommandType.StoredProcedure,
            It.IsAny<IDbTransaction?>()), Times.Once);
    }

    [Fact]
    [Trait("AC", "M1UC13")]
    public async Task UpdateAsync_UsesCorrectFunctionAndParameters()
    {
        var (mockDapper, repo) = CreateSut();
        var userId = Guid.NewGuid();
        var user = new User(userId, Email.Create("test@example.com"), DateTime.UtcNow);
        user.SetPassword(PasswordHash.Create("$argon2id$someHash"));

        await repo.UpdateAsync(user);

        mockDapper.Verify(d => d.ExecuteAsync(
            It.IsAny<IDbConnection>(),
            "identity.update_user_password",
            It.Is<object>(p =>
                (Guid)p.GetType().GetProperty("p_user_id")!.GetValue(p)! == userId &&
                (string)p.GetType().GetProperty("p_password_hash")!.GetValue(p)! == "$argon2id$someHash"),
            CommandType.StoredProcedure,
            It.IsAny<IDbTransaction?>()), Times.Once);
    }
}
