using Moq;
using PanoramaMusic.Reporting.Application.Handlers;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Entities;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Application;

public class SaveReportHandlerTests
{
	private readonly Mock<IDatasourceOptionReader> _datasourceOptionReaderMock = new();
	private readonly Mock<ISavedReportRepository> _repositoryMock = new();
	private readonly Mock<IUserContext> _userContextMock = new();
	private readonly StudentFieldRegistry _registry = new();
	private readonly Guid _userId = Guid.NewGuid();

	public SaveReportHandlerTests()
	{
		_userContextMock.SetupGet(m => m.UserId).Returns(_userId);
		_userContextMock.SetupGet(m => m.Email).Returns("teacher@test.com");
	}

	private SaveReportHandler CreateHandler()
	{
		var factory = new ReportDefinitionFactory(_registry, _datasourceOptionReaderMock.Object);
		return new SaveReportHandler(factory, _repositoryMock.Object, _userContextMock.Object, TimeProvider.System);
	}

	[Fact]
	[Trait("AC", "321UC1")]
	public async Task HandleAsync_BlankName_ThrowsAndNeverCallsCreateAsync()
	{
		var handler = CreateHandler();
		var request = new SaveReportRequest("   ", new RunReportRequest([], ["student.name"]));

		await Should.ThrowAsync<InvalidSavedReportException>(() => handler.HandleAsync(request, TestContext.Current.CancellationToken));

		_repositoryMock.Verify(repo => repo.CreateAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "321UC2")]
	public async Task HandleAsync_DefinitionFailsRegistryValidation_ThrowsAndNeverCallsCreateAsync()
	{
		var handler = CreateHandler();
		var request = new SaveReportRequest(
			"Grade 4 Contacts",
			new RunReportRequest([new ReportFilterRequest("student.unknown", "equals", ["x"])], ["student.name"]));

		await Should.ThrowAsync<InvalidReportDefinitionException>(() => handler.HandleAsync(request, TestContext.Current.CancellationToken));

		_repositoryMock.Verify(repo => repo.CreateAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "321UC3")]
	public async Task HandleAsync_AuthenticatedTeacherSaves_RecordsThemAsCreatorWithNoLastRunAndIsOwnerTrue()
	{
		SavedReport? created = null;
		_repositoryMock
			.Setup(repo => repo.CreateAsync(It.IsAny<SavedReport>(), It.IsAny<CancellationToken>()))
			.Callback<SavedReport, CancellationToken>((report, _) => created = report)
			.Returns(Task.CompletedTask);
		_repositoryMock
			.Setup(repo => repo.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(() => new SavedReportRecord(created!, "teacher@test.com"));

		var handler = CreateHandler();
		var request = new SaveReportRequest("Grade 4 Contacts", new RunReportRequest([], ["student.name"]));

		var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

		created!.CreatedBy.ShouldBe(_userId);
		created.LastRunAt.ShouldBeNull();
		result.IsOwner.ShouldBeTrue();
	}
}