using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Persistence.Tests.Fixtures;
using PanoramaMusic.Persistence.Tests.Repository;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Persistence.Tests;

/// <summary>
/// Drives real Identity handlers against a real Postgres-backed <see cref="IUnitOfWork"/>
/// and <see cref="IAuditLogger"/>, verifying the audit_events row that actually lands in
/// the database rather than a mocked call. Identity-side repositories that a given
/// scenario does not exercise are mocked; the point under test is the audit write.
/// </summary>
public class IdentityAuditTrailTests : IClassFixture<UnitOfWorkDatabaseFixture>
{
	private readonly UnitOfWorkDatabaseContext _context;
	private readonly IdentityAuditTrailTestReader _identityAuditTrailTestReader;
	private readonly IAuditContext _auditContext;

	public IdentityAuditTrailTests(UnitOfWorkDatabaseFixture fixture)
	{
		_context = fixture.CreateContext();

		var correlationId = Guid.NewGuid();
		_context.Contexts.AuditContextMock
			.SetupGet(m => m.CorrelationId)
			.Returns(correlationId);

		_identityAuditTrailTestReader = _context.ServiceProvider.GetRequiredService<IdentityAuditTrailTestReader>();
		_auditContext = _context.Contexts.AuditContextMock.Object;
	}

	[Fact]
	[Trait("AC", "M1.5UC5")]
	public async Task GivenAnIdentityHandlerCompletesSuccessfully_WhenAuditLoggerLogIsCalled_ThenTheAuditEventRowContainsAllRequiredFields()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var targetUserId = Guid.NewGuid();
		var actorId = Guid.NewGuid();
		const string actorEmail = "admin-uc5@test.com";

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(targetUserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new User(targetUserId, Email.Create("teacher-uc5@test.com"), DateTime.UtcNow));

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.ActivateAsync(targetUserId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		_context.Contexts.UserContextMock.SetupGet(m => m.UserId).Returns(actorId);
		_context.Contexts.UserContextMock.SetupGet(m => m.Email).Returns(actorEmail);

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<ActivateUserHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		await handler.HandleAsync(new ActivateUserCommand(targetUserId), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _identityAuditTrailTestReader.FetchByTargetAsync(IdentityAuditEventTypes.UserActivated, targetUserId, cancellationToken);

		row.ShouldNotBeNull();
		row.OccurredAt.Kind.ShouldBe(DateTimeKind.Utc);
		row.EventType.ShouldBe(IdentityAuditEventTypes.UserActivated);
		row.ActorId.ShouldBe(actorId);
		row.ActorEmail.ShouldBe(actorEmail);
		row.TargetId.ShouldBe(targetUserId);
		row.SourceIp.ShouldBe(_auditContext.SourceIp);
		row.UserAgent.ShouldBe(_auditContext.UserAgent);
		row.CorrelationId.ShouldBe(_auditContext.CorrelationId);
		row.Outcome.ShouldBe(AuditOutcomes.Success);
		row.Detail.ShouldNotBeNull();
	}

	[Fact]
	[Trait("AC", "M1.5UC6")]
	public async Task GivenAnIdentityHandlerWritesAnAuditEvent_WhenCommitAsyncIsCalled_ThenExactlyOneRowIsWritten()
	{
		var cancellationToken = TestContext.Current.CancellationToken;

		// Commit path
		var committedTargetId = Guid.NewGuid();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(committedTargetId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new User(committedTargetId, Email.Create("teacher-uc6a@test.com"), DateTime.UtcNow));

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.ActivateAsync(committedTargetId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<ActivateUserHandler>();

		_context.Contexts.UserContextMock.SetupGet(m => m.UserId).Returns(Guid.NewGuid());
		_context.Contexts.UserContextMock.SetupGet(m => m.Email).Returns("admin-uc6a@test.com");

		await unitOfWork.BeginAsync(cancellationToken);
		await handler.HandleAsync(new ActivateUserCommand(committedTargetId), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var countByTarget = await _identityAuditTrailTestReader.CountByTargetAsync(IdentityAuditEventTypes.UserActivated, committedTargetId, cancellationToken);
		countByTarget.ShouldBe(1);
	}

	[Fact]
	[Trait("AC", "M1.5UC6")]
	public async Task GivenAnIdentityHandlerWritesAnAuditEvent_WhenCommitAsyncIsCalled_ThenExactlyOneRowIsWritten_AndWhenRollbackAsyncIsCalled_ThenNoRowIsWritten()
	{
		var cancellationToken = TestContext.Current.CancellationToken;

		// Rollback path — an exception surfaces before commit, as it would when the
		// UnitOfWorkMiddleware rolls back a failed request.
		var rolledBackTargetId = Guid.NewGuid();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(rolledBackTargetId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new User(rolledBackTargetId, Email.Create("teacher-uc6b@test.com"), DateTime.UtcNow));

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.ActivateAsync(rolledBackTargetId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<ActivateUserHandler>();

		_context.Contexts.UserContextMock.SetupGet(m => m.UserId).Returns(Guid.NewGuid());
		_context.Contexts.UserContextMock.SetupGet(m => m.Email).Returns("admin-uc6a@test.com");

		await unitOfWork.BeginAsync(cancellationToken);
		await handler.HandleAsync(new ActivateUserCommand(rolledBackTargetId), cancellationToken);
		await unitOfWork.RollbackAsync(cancellationToken);

		var countByTarget = await _identityAuditTrailTestReader.CountByTargetAsync(IdentityAuditEventTypes.UserActivated, rolledBackTargetId, cancellationToken);
		countByTarget.ShouldBe(0);
	}

	[Fact]
	[Trait("AC", "M1.5UC7")]
	public async Task GivenAnAnonymousActorTriggersAFailedLogin_WhenAuditLoggerLogIsCalled_ThenTheRowHasANullActorAndNoSecretAnywhere()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var attemptedEmail = $"attempt-uc7-{Guid.NewGuid()}@test.com";
		const string submittedPassword = "TotallyWrongPassword1!";

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(attemptedEmail, It.IsAny<CancellationToken>()))
			.ReturnsAsync((User?)null);

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.DummyHash)
			.Returns(PasswordHash.Create("dummy-salt.dummy-hash"));

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>()))
			.Returns(false);

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<LoginHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		await Should.ThrowAsync<UnauthorizedException>(
			() => handler.HandleAsync(new LoginCommand(new LoginRequest(attemptedEmail, submittedPassword)), cancellationToken));

		// The UnitOfWorkMiddleware would roll back the ambient transaction on this
		// exception — the failure audit row must still survive via the isolated write.
		await unitOfWork.RollbackAsync(cancellationToken);

		var row = await _identityAuditTrailTestReader.FetchLatestByDetailContainsAsync(IdentityAuditEventTypes.LoginFailed, attemptedEmail, cancellationToken);

		row.ShouldNotBeNull();
		row.ActorId.ShouldBeNull();
		row.ActorEmail.ShouldBeNull();
		row.Outcome.ShouldBe(AuditOutcomes.Failure);
		row.Reason.ShouldBe("InvalidCredentials");
		row.Detail.ShouldContain(attemptedEmail);
		row.RawRow.ShouldNotContain(submittedPassword);
	}

	[Fact]
	[Trait("AC", "M1.5UC8")]
	public async Task GivenAnAdminChangesTheRolesOfATargetUser_WhenTheRoleChangeAuditEventIsRecorded_ThenTheDetailBagContainsBeforeAndAfterRoleSets()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var targetUserId = Guid.NewGuid();
		var actorId = Guid.NewGuid();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByIdAsync(targetUserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new User(targetUserId, Email.Create("teacher-uc8@test.com"), DateTime.UtcNow));

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.GetRolesAsync(targetUserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.SetRolesAsync(targetUserId, It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Options.AdminOptionsMock
			.Setup(a => a.SeedAdminEmail)
			.Returns(string.Empty);

		_context.Contexts.UserContextMock.SetupGet(m => m.UserId).Returns(Guid.NewGuid());
		_context.Contexts.UserContextMock.SetupGet(m => m.Email).Returns("admin-uc6a@test.com");

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<UpdateUserRolesHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		await handler.HandleAsync(new UpdateUserRolesCommand(targetUserId, new UpdateUserRolesRequest([Role.Teacher, Role.Admin])), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _identityAuditTrailTestReader.FetchByTargetAsync(IdentityAuditEventTypes.RolesChanged, targetUserId, cancellationToken);

		row.ShouldNotBeNull();
		using var detail = JsonDocument.Parse(row.Detail);
		detail.RootElement.GetProperty("rolesBefore").EnumerateArray().Select(e => e.GetString()).ShouldBe(["Teacher"]);
		detail.RootElement.GetProperty("rolesAfter").EnumerateArray().Select(e => e.GetString()).ShouldBe(["Teacher", "Admin"]);
	}

	[Fact]
	[Trait("AC", "M1.5UC9")]
	public async Task GivenASuccessfulLogin_WhenTheAuditEventIsRecorded_ThenNoPasswordRawTokenOrHashAppearsAnywhereInTheRow()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		const string plainTextPassword = "CorrectHorseBattery1!";
		var user = new User(Guid.NewGuid(), Email.Create("login-uc9@test.com"), DateTime.UtcNow);
		user.SetPassword(PasswordHash.Create("$argon2id$v=19$existing-hash"));
		user.Activate();

		_context.Repositories.UserRepositoryMock
			.Setup(r => r.GetByEmailAsync(user.Email.Value, It.IsAny<CancellationToken>()))
			.ReturnsAsync(user);

		_context.Repositories.UserRoleRepositoryMock
			.Setup(r => r.GetRolesAsync(user.UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([Role.Teacher]);

		_context.Services.PasswordHashServiceMock
			.Setup(h => h.Verify(plainTextPassword, It.IsAny<PasswordHash>()))
			.Returns(true);

		var accessToken = $"access-{Guid.NewGuid()}";
		_context.Services.JwtServiceMock
			.Setup(j => j.GenerateToken(user.UserId, user.Email.Value, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken(accessToken, DateTime.UtcNow.AddMinutes(15), Guid.NewGuid()));

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		_context.Contexts.ClientContextMock.SetupGet(c => c.UserAgent).Returns("xunit");
		_context.Contexts.ClientContextMock.SetupGet(c => c.IpAddress).Returns("127.0.0.1");

		var unitOfWork = _context.ServiceProvider.GetRequiredService<IUnitOfWork>();
		var handler = _context.ServiceProvider.GetRequiredService<LoginHandler>();

		await unitOfWork.BeginAsync(cancellationToken);
		var result = await handler.HandleAsync(new LoginCommand(new LoginRequest(user.Email.Value, plainTextPassword)), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await _identityAuditTrailTestReader.FetchByActorAsync(IdentityAuditEventTypes.LoginSucceeded, user.UserId, cancellationToken);

		row.ShouldNotBeNull();
		row.ActorEmail.ShouldBe(user.Email.Value);
		row.RawRow.ShouldNotContain(plainTextPassword);
		row.RawRow.ShouldNotContain(accessToken);
		row.RawRow.ShouldNotContain(result.Tokens!.RefreshToken);
	}
}