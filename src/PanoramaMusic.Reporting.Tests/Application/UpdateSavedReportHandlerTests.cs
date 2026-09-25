using Moq;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Entities;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application;

public class UpdateSavedReportHandlerTests
{
	private readonly Mock<IDatasourceOptionReader> _datasourceOptionReaderMock = new();
	private readonly Mock<ISavedReportRepository> _repositoryMock = new();
	private readonly Mock<IUserContext> _userContextMock = new();
	private readonly StudentFieldRegistry _registry = new();
	private readonly Guid _creatorId = Guid.NewGuid();

	public UpdateSavedReportHandlerTests()
	{
		_userContextMock.SetupGet(m => m.UserId).Returns(_creatorId);
		_userContextMock.SetupGet(m => m.Email).Returns("teacher@test.com");
	}

	private UpdateSavedReportHandler CreateHandler()
	{
		var factory = new ReportDefinitionFactory(_registry, _datasourceOptionReaderMock.Object);
		return new UpdateSavedReportHandler(factory, _repositoryMock.Object, _userContextMock.Object);
	}

	private SavedReport CreateExistingReport(Guid createdBy) => new(
		Guid.NewGuid(),
		"Grade 4 Contacts",
		new StoredReportDefinition([], ["student.name"]),
		createdBy,
		DateTime.UtcNow,
		lastRunAt: null);

	[Fact]
	[Trait("AC", "322UC1")]
	public async Task HandleAsync_Creator_CallsUpdateAsyncWithNewNameAndDefinitionAndResultIsOwnerTrue()
	{
		var report = CreateExistingReport(_creatorId);
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(report.SavedReportId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new SavedReportRecord(report, "teacher@test.com"));

		var handler = CreateHandler();
		var request = new SaveReportRequest("Grade 5 Contacts", new RunReportRequest([], ["student.name", "student.class"]));

		var result = await handler.HandleAsync(report.SavedReportId, request, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => report.Name.ShouldBe("Grade 5 Contacts"),
			() => report.Definition.Columns.ShouldBe(["student.name", "student.class"]),
			() => result.IsOwner.ShouldBeTrue());
		_repositoryMock.Verify(repo => repo.UpdateAsync(report, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "322UC2")]
	public async Task HandleAsync_NonCreator_ThrowsForbiddenExceptionAndNeverCallsUpdateAsync()
	{
		var report = CreateExistingReport(Guid.NewGuid());
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(report.SavedReportId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new SavedReportRecord(report, "other@test.com"));

		var handler = CreateHandler();
		var request = new SaveReportRequest("Hijacked", new RunReportRequest([], ["student.name"]));

		await Should.ThrowAsync<ForbiddenException>(
			() => handler.HandleAsync(report.SavedReportId, request, TestContext.Current.CancellationToken));

		_repositoryMock.Verify(repo => repo.UpdateAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "322UC2")]
	public async Task HandleAsync_NonCreatorWithUnregisteredField_IsRefusedBeforeRegistryValidationAndNeverCallsUpdateAsync()
	{
		var report = CreateExistingReport(Guid.NewGuid());
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(report.SavedReportId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new SavedReportRecord(report, "other@test.com"));

		var handler = CreateHandler();
		var request = new SaveReportRequest(
			"Hijacked",
			new RunReportRequest([new ReportFilterRequest("student.unknown", "equals", ["x"])], ["student.name"]));

		await Should.ThrowAsync<ForbiddenException>(
			() => handler.HandleAsync(report.SavedReportId, request, TestContext.Current.CancellationToken));

		_repositoryMock.Verify(repo => repo.UpdateAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "322UC5")]
	public async Task HandleAsync_UnknownId_ThrowsEntityNotFoundExceptionAndNeverCallsUpdateAsync()
	{
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((SavedReportRecord?)null);

		var handler = CreateHandler();
		var request = new SaveReportRequest("Grade 5 Contacts", new RunReportRequest([], ["student.name"]));

		await Should.ThrowAsync<EntityNotFoundException>(
			() => handler.HandleAsync(Guid.NewGuid(), request, TestContext.Current.CancellationToken));

		_repositoryMock.Verify(repo => repo.UpdateAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "322UC6")]
	public async Task HandleAsync_BlankName_ThrowsInvalidSavedReportExceptionAndNeverCallsUpdateAsync()
	{
		var report = CreateExistingReport(_creatorId);
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(report.SavedReportId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new SavedReportRecord(report, "teacher@test.com"));

		var handler = CreateHandler();
		var request = new SaveReportRequest("   ", new RunReportRequest([], ["student.name"]));

		await Should.ThrowAsync<InvalidSavedReportException>(
			() => handler.HandleAsync(report.SavedReportId, request, TestContext.Current.CancellationToken));

		_repositoryMock.Verify(repo => repo.UpdateAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "322UC6")]
	public async Task HandleAsync_UnregisteredFieldByCreator_ThrowsInvalidReportDefinitionExceptionAndNeverCallsUpdateAsync()
	{
		var report = CreateExistingReport(_creatorId);
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(report.SavedReportId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(new SavedReportRecord(report, "teacher@test.com"));

		var handler = CreateHandler();
		var request = new SaveReportRequest(
			"Grade 5 Contacts",
			new RunReportRequest([new ReportFilterRequest("student.unknown", "equals", ["x"])], ["student.name"]));

		await Should.ThrowAsync<InvalidReportDefinitionException>(
			() => handler.HandleAsync(report.SavedReportId, request, TestContext.Current.CancellationToken));

		_repositoryMock.Verify(repo => repo.UpdateAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}
