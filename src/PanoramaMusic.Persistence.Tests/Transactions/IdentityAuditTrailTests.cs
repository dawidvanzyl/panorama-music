using Moq;
using Npgsql;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Audit.Infrastructure.Repositories;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Persistence.Factories;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Persistence.Tests.Transactions;

/// <summary>
/// Drives real Identity handlers against a real Postgres-backed <see cref="IUnitOfWork"/>
/// and <see cref="IAuditLogger"/>, verifying the audit_events row that actually lands in
/// the database rather than a mocked call. Identity-side repositories that a given
/// scenario does not exercise are mocked; the point under test is the audit write.
/// </summary>
public class IdentityAuditTrailTests(UnitOfWorkDatabaseFixture fixture) : IClassFixture<UnitOfWorkDatabaseFixture>
{
	[Fact]
	[Trait("AC", "M1.5UC5")]
	public async Task GivenAnIdentityHandlerCompletesSuccessfully_WhenAuditLoggerLogIsCalled_ThenTheAuditEventRowContainsAllRequiredFields()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var targetUserId = Guid.NewGuid();
		var actorId = Guid.NewGuid();
		const string actorEmail = "admin-uc5@test.com";

		var userRepo = new Mock<IUserRepository>();
		userRepo.Setup(r => r.GetByIdAsync(targetUserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new User(targetUserId, Email.Create("teacher-uc5@test.com"), DateTime.UtcNow));
		userRepo.Setup(r => r.ActivateAsync(targetUserId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		var auditContext = new StubAuditContext();
		await using var unitOfWork = new NpgsqlUnitOfWork(new NpgsqlConnectionFactory(fixture.ApplicationConnectionString));
		var auditLogger = new AuditEventRepository(unitOfWork);
		var auditEventFactory = new AuditEventFactory(auditContext);
		var handler = new ActivateUserHandler(userRepo.Object, new StubUserContext(actorId, actorEmail), auditLogger, auditEventFactory);

		await unitOfWork.BeginAsync(cancellationToken);
		await handler.HandleAsync(new ActivateUserCommand(targetUserId), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await FetchByTargetAsync(IdentityAuditEventTypes.UserActivated, targetUserId, cancellationToken);

		row.ShouldNotBeNull();
		row.OccurredAt.Kind.ShouldBe(DateTimeKind.Utc);
		row.EventType.ShouldBe(IdentityAuditEventTypes.UserActivated);
		row.ActorId.ShouldBe(actorId);
		row.ActorEmail.ShouldBe(actorEmail);
		row.TargetId.ShouldBe(targetUserId);
		row.SourceIp.ShouldBe(auditContext.SourceIp);
		row.UserAgent.ShouldBe(auditContext.UserAgent);
		row.CorrelationId.ShouldBe(auditContext.CorrelationId);
		row.Outcome.ShouldBe(AuditOutcomes.Success);
		row.Detail.ShouldNotBeNull();
	}

	[Fact]
	[Trait("AC", "M1.5UC6")]
	public async Task GivenAnIdentityHandlerWritesAnAuditEvent_WhenCommitAsyncIsCalled_ThenExactlyOneRowIsWritten_AndWhenRollbackAsyncIsCalled_ThenNoRowIsWritten()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var auditContext = new StubAuditContext();

		// Commit path
		var committedTargetId = Guid.NewGuid();
		var userRepo = new Mock<IUserRepository>();
		userRepo.Setup(r => r.GetByIdAsync(committedTargetId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new User(committedTargetId, Email.Create("teacher-uc6a@test.com"), DateTime.UtcNow));
		userRepo.Setup(r => r.ActivateAsync(committedTargetId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await using (var unitOfWork = new NpgsqlUnitOfWork(new NpgsqlConnectionFactory(fixture.ApplicationConnectionString)))
		{
			var handler = new ActivateUserHandler(
				userRepo.Object,
				new StubUserContext(Guid.NewGuid(), "admin-uc6a@test.com"),
				new AuditEventRepository(unitOfWork),
				new AuditEventFactory(auditContext));

			await unitOfWork.BeginAsync(cancellationToken);
			await handler.HandleAsync(new ActivateUserCommand(committedTargetId), cancellationToken);
			await unitOfWork.CommitAsync(cancellationToken);
		}

		(await CountByTargetAsync(IdentityAuditEventTypes.UserActivated, committedTargetId, cancellationToken)).ShouldBe(1);

		// Rollback path — an exception surfaces before commit, as it would when the
		// UnitOfWorkMiddleware rolls back a failed request.
		var rolledBackTargetId = Guid.NewGuid();
		var userRepo2 = new Mock<IUserRepository>();
		userRepo2.Setup(r => r.GetByIdAsync(rolledBackTargetId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new User(rolledBackTargetId, Email.Create("teacher-uc6b@test.com"), DateTime.UtcNow));
		userRepo2.Setup(r => r.ActivateAsync(rolledBackTargetId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await using (var unitOfWork = new NpgsqlUnitOfWork(new NpgsqlConnectionFactory(fixture.ApplicationConnectionString)))
		{
			var handler = new ActivateUserHandler(
				userRepo2.Object,
				new StubUserContext(Guid.NewGuid(), "admin-uc6b@test.com"),
				new AuditEventRepository(unitOfWork),
				new AuditEventFactory(auditContext));

			await unitOfWork.BeginAsync(cancellationToken);
			await handler.HandleAsync(new ActivateUserCommand(rolledBackTargetId), cancellationToken);
			await unitOfWork.RollbackAsync(cancellationToken);
		}

		(await CountByTargetAsync(IdentityAuditEventTypes.UserActivated, rolledBackTargetId, cancellationToken)).ShouldBe(0);
	}

	[Fact]
	[Trait("AC", "M1.5UC7")]
	public async Task GivenAnAnonymousActorTriggersAFailedLogin_WhenAuditLoggerLogIsCalled_ThenTheRowHasANullActorAndNoSecretAnywhere()
	{
		var cancellationToken = TestContext.Current.CancellationToken;
		var attemptedEmail = $"attempt-uc7-{Guid.NewGuid()}@test.com";
		const string submittedPassword = "TotallyWrongPassword1!";

		var userRepo = new Mock<IUserRepository>();
		userRepo.Setup(r => r.GetByEmailAsync(attemptedEmail, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

		var passwordHasher = new Mock<IPasswordHashService>();
		passwordHasher.Setup(h => h.DummyHash).Returns(PasswordHash.Create("dummy-salt.dummy-hash"));
		passwordHasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<PasswordHash>())).Returns(false);

		var auditContext = new StubAuditContext();
		await using var unitOfWork = new NpgsqlUnitOfWork(new NpgsqlConnectionFactory(fixture.ApplicationConnectionString));
		var auditLogger = new AuditEventRepository(unitOfWork);
		var auditEventFactory = new AuditEventFactory(auditContext);

		var handler = new LoginHandler(
			userRepo.Object,
			new Mock<IUserRoleRepository>().Object,
			passwordHasher.Object,
			new Mock<IJwtService>().Object,
			new Mock<IRefreshTokenRepository>().Object,
			new Mock<IPasswordResetTokenRepository>().Object,
			new Mock<IClientContext>().Object,
			auditLogger,
			auditEventFactory,
			unitOfWork);

		await unitOfWork.BeginAsync(cancellationToken);
		await Should.ThrowAsync<UnauthorizedException>(
			() => handler.HandleAsync(new LoginCommand(new LoginRequest(attemptedEmail, submittedPassword)), cancellationToken));

		// The UnitOfWorkMiddleware would roll back the ambient transaction on this
		// exception — the failure audit row must still survive via the isolated write.
		await unitOfWork.RollbackAsync(cancellationToken);

		var row = await FetchLatestByDetailContainsAsync(IdentityAuditEventTypes.LoginFailed, attemptedEmail, cancellationToken);

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

		var userRepo = new Mock<IUserRepository>();
		userRepo.Setup(r => r.GetByIdAsync(targetUserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new User(targetUserId, Email.Create("teacher-uc8@test.com"), DateTime.UtcNow));

		var userRoleRepo = new Mock<IUserRoleRepository>();
		userRoleRepo.Setup(r => r.GetRolesAsync(targetUserId, It.IsAny<CancellationToken>())).ReturnsAsync((IList<Role>)[Role.Teacher]);
		userRoleRepo.Setup(r => r.SetRolesAsync(targetUserId, It.IsAny<IList<Role>>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		var adminOptions = new Mock<IAdminOptions>();
		adminOptions.Setup(a => a.SeedAdminEmail).Returns(string.Empty);

		var auditContext = new StubAuditContext();
		await using var unitOfWork = new NpgsqlUnitOfWork(new NpgsqlConnectionFactory(fixture.ApplicationConnectionString));
		var handler = new UpdateUserRolesHandler(
			userRepo.Object,
			userRoleRepo.Object,
			adminOptions.Object,
			new StubUserContext(actorId, "admin-uc8@test.com"),
			new AuditEventRepository(unitOfWork),
			new AuditEventFactory(auditContext));

		await unitOfWork.BeginAsync(cancellationToken);
		await handler.HandleAsync(
			new UpdateUserRolesCommand(targetUserId, new UpdateUserRolesRequest([Role.Teacher, Role.Admin])),
			cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await FetchByTargetAsync(IdentityAuditEventTypes.RolesChanged, targetUserId, cancellationToken);

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

		var userRepo = new Mock<IUserRepository>();
		userRepo.Setup(r => r.GetByEmailAsync(user.Email.Value, It.IsAny<CancellationToken>())).ReturnsAsync(user);

		var roleRepo = new Mock<IUserRoleRepository>();
		roleRepo.Setup(r => r.GetRolesAsync(user.UserId, It.IsAny<CancellationToken>())).ReturnsAsync((IList<Role>)[Role.Teacher]);

		var passwordHasher = new Mock<IPasswordHashService>();
		passwordHasher.Setup(h => h.Verify(plainTextPassword, It.IsAny<PasswordHash>())).Returns(true);

		var accessToken = $"access-{Guid.NewGuid()}";
		var jwt = new Mock<IJwtService>();
		jwt.Setup(j => j.GenerateToken(user.UserId, user.Email.Value, It.IsAny<IList<Role>>()))
			.Returns(new JwtToken(accessToken, DateTime.UtcNow.AddMinutes(15), Guid.NewGuid()));

		var refreshRepo = new Mock<IRefreshTokenRepository>();
		refreshRepo.Setup(r => r.CreateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		var clientContext = new Mock<IClientContext>();
		clientContext.SetupGet(c => c.UserAgent).Returns("xunit");
		clientContext.SetupGet(c => c.IpAddress).Returns("127.0.0.1");

		var auditContext = new StubAuditContext();
		await using var unitOfWork = new NpgsqlUnitOfWork(new NpgsqlConnectionFactory(fixture.ApplicationConnectionString));
		var handler = new LoginHandler(
			userRepo.Object,
			roleRepo.Object,
			passwordHasher.Object,
			jwt.Object,
			refreshRepo.Object,
			new Mock<IPasswordResetTokenRepository>().Object,
			clientContext.Object,
			new AuditEventRepository(unitOfWork),
			new AuditEventFactory(auditContext),
			unitOfWork);

		await unitOfWork.BeginAsync(cancellationToken);
		var result = await handler.HandleAsync(new LoginCommand(new LoginRequest(user.Email.Value, plainTextPassword)), cancellationToken);
		await unitOfWork.CommitAsync(cancellationToken);

		var row = await FetchByActorAsync(IdentityAuditEventTypes.LoginSucceeded, user.UserId, cancellationToken);

		row.ShouldNotBeNull();
		row.ActorEmail.ShouldBe(user.Email.Value);
		row.RawRow.ShouldNotContain(plainTextPassword);
		row.RawRow.ShouldNotContain(accessToken);
		row.RawRow.ShouldNotContain(result.Tokens!.RefreshToken);
	}

	private async Task<AuditEventRow?> FetchByTargetAsync(string eventType, Guid targetId, CancellationToken cancellationToken) =>
		await QuerySingleAsync(
			"SELECT * FROM audit.audit_events WHERE event_type = @event_type AND target_id = @target_id ORDER BY occurred_at DESC LIMIT 1;",
			command =>
			{
				command.Parameters.AddWithValue("event_type", eventType);
				command.Parameters.AddWithValue("target_id", targetId);
			},
			cancellationToken);

	private async Task<AuditEventRow?> FetchByActorAsync(string eventType, Guid actorId, CancellationToken cancellationToken) =>
		await QuerySingleAsync(
			"SELECT * FROM audit.audit_events WHERE event_type = @event_type AND actor_id = @actor_id ORDER BY occurred_at DESC LIMIT 1;",
			command =>
			{
				command.Parameters.AddWithValue("event_type", eventType);
				command.Parameters.AddWithValue("actor_id", actorId);
			},
			cancellationToken);

	private async Task<AuditEventRow?> FetchLatestByDetailContainsAsync(string eventType, string detailFragment, CancellationToken cancellationToken) =>
		await QuerySingleAsync(
			"SELECT * FROM audit.audit_events WHERE event_type = @event_type AND detail::text LIKE @fragment ORDER BY occurred_at DESC LIMIT 1;",
			command =>
			{
				command.Parameters.AddWithValue("event_type", eventType);
				command.Parameters.AddWithValue("fragment", $"%{detailFragment}%");
			},
			cancellationToken);

	private async Task<long> CountByTargetAsync(string eventType, Guid targetId, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(fixture.ApplicationConnectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = "SELECT count(*) FROM audit.audit_events WHERE event_type = @event_type AND target_id = @target_id;";
		command.Parameters.AddWithValue("event_type", eventType);
		command.Parameters.AddWithValue("target_id", targetId);
		return (long)(await command.ExecuteScalarAsync(cancellationToken))!;
	}

	private async Task<AuditEventRow?> QuerySingleAsync(string sql, Action<NpgsqlCommand> configure, CancellationToken cancellationToken)
	{
		await using var connection = new NpgsqlConnection(fixture.ApplicationConnectionString);
		await connection.OpenAsync(cancellationToken);
		await using var command = connection.CreateCommand();
		command.CommandText = sql;
		configure(command);
		await using var reader = await command.ExecuteReaderAsync(cancellationToken);
		if (!await reader.ReadAsync(cancellationToken))
			return null;

		var detail = reader.GetString(reader.GetOrdinal("detail"));
		return new AuditEventRow(
			reader.GetDateTime(reader.GetOrdinal("occurred_at")),
			reader.GetString(reader.GetOrdinal("event_type")),
			reader.IsDBNull(reader.GetOrdinal("actor_id")) ? null : reader.GetGuid(reader.GetOrdinal("actor_id")),
			reader.IsDBNull(reader.GetOrdinal("actor_email")) ? null : reader.GetString(reader.GetOrdinal("actor_email")),
			reader.IsDBNull(reader.GetOrdinal("target_id")) ? null : reader.GetGuid(reader.GetOrdinal("target_id")),
			reader.GetString(reader.GetOrdinal("source_ip")),
			reader.GetString(reader.GetOrdinal("user_agent")),
			reader.GetGuid(reader.GetOrdinal("correlation_id")),
			reader.GetString(reader.GetOrdinal("outcome")),
			reader.IsDBNull(reader.GetOrdinal("reason")) ? null : reader.GetString(reader.GetOrdinal("reason")),
			detail,
			BuildRawRow(reader));
	}

	private static string BuildRawRow(NpgsqlDataReader reader)
	{
		var values = new object[reader.FieldCount];
		reader.GetValues(values);
		return string.Join('|', values.Select(v => v?.ToString() ?? string.Empty));
	}

	private sealed record AuditEventRow(
		DateTime OccurredAt,
		string EventType,
		Guid? ActorId,
		string? ActorEmail,
		Guid? TargetId,
		string SourceIp,
		string UserAgent,
		Guid CorrelationId,
		string Outcome,
		string? Reason,
		string Detail,
		string RawRow);

	private sealed class StubUserContext(Guid? userId, string? email) : IUserContext
	{
		public Guid? UserId => userId;
		public string? Email => email;
	}

	private sealed class StubAuditContext : IAuditContext
	{
		public string SourceIp => "127.0.0.1";
		public string UserAgent => "xunit";
		public Guid CorrelationId { get; } = Guid.NewGuid();
	}
}