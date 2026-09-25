using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Messages;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

/// <summary>
/// Exercises the real, DI-resolved saved-report handlers and repository
/// against a live Postgres — each test scopes its own unit of work, which is
/// always rolled back, so saved reports never leak between tests.
/// </summary>
public class SavedReportHandlersTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;

	public SavedReportHandlersTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	private static RunReportRequest BuildDefinition(string nameContains) =>
		new([new ReportFilterRequest("student.name", "contains", [nameContains])], ["student.name"]);

	[Fact]
	[Trait("AC", "321UC4")]
	public async Task GetSavedReportsHandler_ReportsSavedByTwoUsers_ReturnsBothWithCreatorEmailAndIsOwnerOnlyForCaller()
	{
		var ct = TestContext.Current.CancellationToken;
		var token = Guid.NewGuid().ToString("N");

		await _fixture.ExecuteInScopeAsync(async services =>
		{
			await using var connection = _fixture.OpenConnection();
			var userAId = await IdentitySeeder.InsertUserAsync(connection, $"a-{token}@test.com");
			var userBId = await IdentitySeeder.InsertUserAsync(connection, $"b-{token}@test.com");

			_fixture.UserContextMock.SetupGet(m => m.UserId).Returns(userAId);
			_fixture.UserContextMock.SetupGet(m => m.Email).Returns($"a-{token}@test.com");
			var saveHandler = services.GetRequiredService<SaveReportHandler>();
			await saveHandler.HandleAsync(new SaveReportRequest($"{token} A", BuildDefinition(token)), ct);

			_fixture.UserContextMock.SetupGet(m => m.UserId).Returns(userBId);
			_fixture.UserContextMock.SetupGet(m => m.Email).Returns($"b-{token}@test.com");
			await saveHandler.HandleAsync(new SaveReportRequest($"{token} B", BuildDefinition(token)), ct);

			var listHandler = services.GetRequiredService<GetSavedReportsHandler>();
			var asB = await listHandler.HandleAsync(ct);
			var reportA = asB.Single(r => r.Name == $"{token} A");
			var reportB = asB.Single(r => r.Name == $"{token} B");
			reportA.CreatedBy.ShouldBe($"a-{token}@test.com");
			reportA.LastRunAt.ShouldBeNull();
			reportA.IsOwner.ShouldBeFalse();
			reportB.CreatedBy.ShouldBe($"b-{token}@test.com");
			reportB.IsOwner.ShouldBeTrue();

			_fixture.UserContextMock.SetupGet(m => m.UserId).Returns(userAId);
			var asA = await listHandler.HandleAsync(ct);
			asA.Single(r => r.Name == $"{token} A").IsOwner.ShouldBeTrue();
			asA.Single(r => r.Name == $"{token} B").IsOwner.ShouldBeFalse();

			return true;
		}, ct);
	}

	[Fact]
	[Trait("AC", "321UC5")]
	public async Task RunSavedReportHandler_StudentChangedAndOneAddedAfterSave_RunReflectsBothAndLastRunMatchesFixedTime()
	{
		var ct = TestContext.Current.CancellationToken;
		var token = Guid.NewGuid().ToString("N");
		var ranAt = new DateTimeOffset(2026, 3, 1, 9, 0, 0, TimeSpan.Zero);

		await _fixture.ExecuteInScopeAsync(async services =>
		{
			await using var connection = _fixture.OpenConnection();
			var userId = await IdentitySeeder.InsertUserAsync(connection, $"teacher-{token}@test.com");
			_fixture.UserContextMock.SetupGet(m => m.UserId).Returns(userId);
			_fixture.UserContextMock.SetupGet(m => m.Email).Returns($"teacher-{token}@test.com");

			var existingId = await StudentSeeder.InsertStudentAsync(connection, "Ivy", token, new DateOnly(2015, 1, 1));

			var saveHandler = services.GetRequiredService<SaveReportHandler>();
			var saved = await saveHandler.HandleAsync(new SaveReportRequest($"{token} report", BuildDefinition(token)), ct);

			var newId = await StudentSeeder.InsertStudentAsync(connection, "Jade", token, new DateOnly(2016, 1, 1));

			_fixture.TimeProvider.SetUtcNow(ranAt);
			var runHandler = services.GetRequiredService<RunSavedReportHandler>();
			var result = await runHandler.HandleAsync(saved.Id, ct);

			result.StudentCount.ShouldBe(2);
			result.Sections.Select(s => s.StudentId).ShouldBe([existingId, newId], ignoreOrder: true);

			var repository = services.GetRequiredService<ISavedReportRepository>();
			var record = await repository.GetByIdAsync(saved.Id, ct);
			record!.Report.LastRunAt.ShouldBe(ranAt.UtcDateTime);

			return true;
		}, ct);
	}

	[Fact]
	public async Task GetSavedReportsHandler_CreatorAccountDeleted_ShowsRemovedCreatorLabel()
	{
		var ct = TestContext.Current.CancellationToken;
		var token = Guid.NewGuid().ToString("N");

		await _fixture.ExecuteInScopeAsync(async services =>
		{
			await using var connection = _fixture.OpenConnection();
			var userId = await IdentitySeeder.InsertUserAsync(connection, $"gone-{token}@test.com");
			_fixture.UserContextMock.SetupGet(m => m.UserId).Returns(userId);
			_fixture.UserContextMock.SetupGet(m => m.Email).Returns($"gone-{token}@test.com");

			var saveHandler = services.GetRequiredService<SaveReportHandler>();
			var saved = await saveHandler.HandleAsync(new SaveReportRequest($"{token} report", BuildDefinition(token)), ct);

			await using (var deleteCommand = connection.CreateCommand())
			{
				deleteCommand.CommandText = "DELETE FROM identity.users WHERE user_id = @user_id;";
				deleteCommand.Parameters.AddWithValue("user_id", userId);
				await deleteCommand.ExecuteNonQueryAsync(ct);
			}

			var listHandler = services.GetRequiredService<GetSavedReportsHandler>();
			var reports = await listHandler.HandleAsync(ct);
			reports.Single(r => r.Name == $"{token} report").CreatedBy.ShouldBe(SavedReportMessages.RemovedCreator);

			return true;
		}, ct);
	}

	[Fact]
	public async Task GetSavedReportsHandler_ReportNamesDifferByCase_OrdersCaseInsensitively()
	{
		var ct = TestContext.Current.CancellationToken;
		var token = Guid.NewGuid().ToString("N");

		await _fixture.ExecuteInScopeAsync(async services =>
		{
			await using var connection = _fixture.OpenConnection();
			var userId = await IdentitySeeder.InsertUserAsync(connection, $"sort-{token}@test.com");
			_fixture.UserContextMock.SetupGet(m => m.UserId).Returns(userId);
			_fixture.UserContextMock.SetupGet(m => m.Email).Returns($"sort-{token}@test.com");

			var saveHandler = services.GetRequiredService<SaveReportHandler>();
			await saveHandler.HandleAsync(new SaveReportRequest($"{token} charlie", BuildDefinition(token)), ct);
			await saveHandler.HandleAsync(new SaveReportRequest($"{token} Alpha", BuildDefinition(token)), ct);
			await saveHandler.HandleAsync(new SaveReportRequest($"{token} bravo", BuildDefinition(token)), ct);

			var listHandler = services.GetRequiredService<GetSavedReportsHandler>();
			var names = (await listHandler.HandleAsync(ct))
				.Where(r => r.Name.Contains(token))
				.Select(r => r.Name)
				.ToList();

			names.ShouldBe([$"{token} Alpha", $"{token} bravo", $"{token} charlie"]);

			return true;
		}, ct);
	}
}